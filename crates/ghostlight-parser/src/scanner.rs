use crate::error::ParserError;
use ghostlight_core::{ContentHash, FileId};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tracing::warn;
use walkdir::WalkDir;

#[cfg(unix)]
use std::os::unix::fs::MetadataExt;

/// Information about a discovered source file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScannedFile {
    pub file_id: FileId,
    pub absolute_path: PathBuf,
    pub size_bytes: u64,
    pub content_hash: ContentHash,
    pub is_test: bool,
}

/// Options controlling the filesystem scanner.
#[derive(Debug, Clone)]
pub struct ScanOptions {
    pub max_file_size_bytes: u64,
    pub allow_symlinks_within_repo: bool,
}

impl Default for ScanOptions {
    fn default() -> Self {
        Self {
            max_file_size_bytes: 5 * 1024 * 1024, // 5 MB
            allow_symlinks_within_repo: true,
        }
    }
}

/// Safely traverses a repository directory, extracting Python source files while
/// enforcing security boundaries (symlink escape defense, size bounds, loop prevention).
pub fn scan_repository<P: AsRef<Path>>(
    root_path: P,
    options: &ScanOptions,
) -> Result<Vec<ScannedFile>, ParserError> {
    let raw_root = root_path.as_ref();
    let canonical_root = fs::canonicalize(raw_root).map_err(|e| ParserError::Io {
        path: raw_root.to_path_buf(),
        source: e,
    })?;

    let mut scanned_files = Vec::new();
    let mut visited_inodes = HashSet::new();

    // Standard directories to ignore
    let ignored_names: HashSet<&str> = [
        ".git",
        ".hg",
        ".svn",
        "__pycache__",
        ".pytest_cache",
        ".tox",
        ".mypy_cache",
        ".ruff_cache",
        "venv",
        ".venv",
        "env",
        ".env",
        "node_modules",
        "target",
        "dist",
        "build",
        ".eggs",
    ]
    .into_iter()
    .collect();

    for entry in WalkDir::new(&canonical_root)
        .follow_links(false) // Handle symlinks explicitly for security
        .into_iter()
        .filter_entry(|e| {
            let file_name = e.file_name().to_string_lossy();
            !ignored_names.contains(file_name.as_ref())
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(err) => {
                warn!("Scanner encountered directory traversal error: {}", err);
                continue;
            }
        };

        let path = entry.path();
        let symlink_meta = match fs::symlink_metadata(path) {
            Ok(m) => m,
            Err(e) => {
                warn!("Cannot read metadata for {:?}: {}", path, e);
                continue;
            }
        };

        // Symlink security checks
        let is_symlink = symlink_meta.file_type().is_symlink();
        let resolved_path = if is_symlink {
            if !options.allow_symlinks_within_repo {
                warn!("Skipping symlink because symlink following is disabled: {:?}", path);
                continue;
            }
            match fs::canonicalize(path) {
                Ok(target) => {
                    // Check if target escapes repository root
                    if !target.starts_with(&canonical_root) {
                        return Err(ParserError::SymlinkEscape {
                            path: path.to_path_buf(),
                            target,
                            root: canonical_root.clone(),
                        });
                    }
                    target
                }
                Err(e) => {
                    warn!("Broken symlink at {:?}: {}", path, e);
                    continue;
                }
            }
        } else {
            path.to_path_buf()
        };

        let final_meta = match fs::metadata(&resolved_path) {
            Ok(m) => m,
            Err(e) => {
                warn!("Cannot read target metadata for {:?}: {}", resolved_path, e);
                continue;
            }
        };

        // Prevent loops using (dev, ino) on Unix
        #[cfg(unix)]
        {
            let dev_ino = (final_meta.dev(), final_meta.ino());
            if !visited_inodes.insert(dev_ino) {
                // Loop detected or hard-link visited
                continue;
            }
        }

        if !final_meta.is_file() {
            continue;
        }

        // Only analyze Python source files (.py)
        if resolved_path.extension().and_then(|s| s.to_str()) != Some("py") {
            continue;
        }

        let size = final_meta.len();
        if size > options.max_file_size_bytes {
            warn!(
                "Skipping oversized file {:?} ({} bytes > {} max)",
                path, size, options.max_file_size_bytes
            );
            continue;
        }

        let content_hash = match ContentHash::from_file(&resolved_path, options.max_file_size_bytes) {
            Ok(h) => h,
            Err(e) => {
                warn!("Failed to hash file {:?}: {}", resolved_path, e);
                continue;
            }
        };

        let file_id = FileId::new(&canonical_root, path);
        let is_test = is_test_file(&file_id);

        scanned_files.push(ScannedFile {
            file_id,
            absolute_path: path.to_path_buf(),
            size_bytes: size,
            content_hash,
            is_test,
        });
    }

    // Sort deterministically by FileId
    scanned_files.sort_by(|a, b| a.file_id.cmp(&b.file_id));

    Ok(scanned_files)
}

/// Heuristically determines if a file path represents a test file.
pub fn is_test_file(file_id: &FileId) -> bool {
    let path_str = file_id.as_str();
    let parts: Vec<&str> = path_str.split('/').collect();

    // Directory heuristic: `tests/`, `test/`, `testing/`
    for part in &parts[..parts.len().saturating_sub(1)] {
        if *part == "test" || *part == "tests" || *part == "testing" {
            return true;
        }
    }

    // File name heuristic: `test_*.py` or `*_test.py`
    if let Some(file_name) = parts.last() {
        if file_name.starts_with("test_") || file_name.ends_with("_test.py") {
            return true;
        }
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_is_test_file() {
        assert!(is_test_file(&FileId::from_relative_path("tests/foo.py")));
        assert!(is_test_file(&FileId::from_relative_path("test/utils.py")));
        assert!(is_test_file(&FileId::from_relative_path("src/test_math.py")));
        assert!(is_test_file(&FileId::from_relative_path("pkg/math_test.py")));
        assert!(!is_test_file(&FileId::from_relative_path("src/math.py")));
        assert!(!is_test_file(&FileId::from_relative_path("testing_helpers.py")));
    }

    #[test]
    fn test_scan_repository_basic() {
        let dir = tempdir().unwrap();
        let root = dir.path();

        fs::write(root.join("main.py"), "print('hello')").unwrap();
        fs::create_dir(root.join("tests")).unwrap();
        fs::write(root.join("tests").join("test_main.py"), "def test_ok(): pass").unwrap();

        let files = scan_repository(root, &ScanOptions::default()).unwrap();
        assert_eq!(files.len(), 2);
        assert_eq!(files[0].file_id.as_str(), "main.py");
        assert!(!files[0].is_test);
        assert_eq!(files[1].file_id.as_str(), "tests/test_main.py");
        assert!(files[1].is_test);
    }

    #[test]
    fn test_symlink_escape_prevention() {
        let dir = tempdir().unwrap();
        let outside_dir = tempdir().unwrap();
        let outside_file = outside_dir.path().join("secret.py");
        fs::write(&outside_file, "SECRET=1").unwrap();

        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            let evil_link = dir.path().join("evil_link.py");
            symlink(&outside_file, &evil_link).unwrap();

            let err = scan_repository(dir.path(), &ScanOptions::default()).unwrap_err();
            match err {
                ParserError::SymlinkEscape { .. } => (),
                other => panic!("Expected SymlinkEscape error, got: {:?}", other),
            }
        }
    }
}
