use ghostlight_core::{FileId, RepositoryFingerprint};
use ghostlight_graph::{build_dependency_graph, DependencyGraph};
use ghostlight_parser::{extract_python_file, ParsedPythonFile};
use std::collections::BTreeMap;
use std::path::Path;

/// Categorization of changes between two repository states.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RepositoryDelta {
    pub added: Vec<FileId>,
    pub modified: Vec<FileId>,
    pub deleted: Vec<FileId>,
    pub unchanged: Vec<FileId>,
}

impl RepositoryDelta {
    /// Computes file-level delta between a baseline fingerprint and current fingerprint.
    pub fn compute(
        baseline: &RepositoryFingerprint,
        current: &RepositoryFingerprint,
    ) -> Self {
        let mut added = Vec::new();
        let mut modified = Vec::new();
        let mut deleted = Vec::new();
        let mut unchanged = Vec::new();

        let base_files = &baseline.file_hashes;
        let curr_files = &current.file_hashes;

        for (path_str, curr_hash) in curr_files {
            let file_id = FileId::from_relative_path(path_str);
            match base_files.get(path_str) {
                Some(base_hash) => {
                    if base_hash == curr_hash {
                        unchanged.push(file_id);
                    } else {
                        modified.push(file_id);
                    }
                }
                None => {
                    added.push(file_id);
                }
            }
        }

        for path_str in base_files.keys() {
            if !curr_files.contains_key(path_str) {
                deleted.push(FileId::from_relative_path(path_str));
            }
        }

        added.sort();
        modified.sort();
        deleted.sort();
        unchanged.sort();

        Self {
            added,
            modified,
            deleted,
            unchanged,
        }
    }

    pub fn has_changes(&self) -> bool {
        !self.added.is_empty() || !self.modified.is_empty() || !self.deleted.is_empty()
    }
}

/// Incremental analysis manager that maintains parsed files in memory,
/// re-parsing only modified and added files, and re-linking the graph.
#[derive(Debug, Clone)]
pub struct IncrementalEngine {
    parsed_cache: BTreeMap<FileId, ParsedPythonFile>,
    current_fingerprint: Option<RepositoryFingerprint>,
}

impl Default for IncrementalEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl IncrementalEngine {
    pub fn new() -> Self {
        Self {
            parsed_cache: BTreeMap::new(),
            current_fingerprint: None,
        }
    }

    /// Performs full scan and initialization.
    pub fn initial_scan(
        &mut self,
        parsed_files: Vec<ParsedPythonFile>,
        fingerprint: RepositoryFingerprint,
    ) -> DependencyGraph {
        self.parsed_cache.clear();
        for pf in parsed_files {
            self.parsed_cache.insert(pf.file_id.clone(), pf);
        }
        self.current_fingerprint = Some(fingerprint);
        self.rebuild_graph()
    }

    /// Applies incremental changes: reparses only modified/added files, removes deleted ones,
    /// and re-links the graph.
    pub fn apply_incremental_changes<P: AsRef<Path>>(
        &mut self,
        repo_root: P,
        delta: &RepositoryDelta,
        new_fingerprint: RepositoryFingerprint,
    ) -> DependencyGraph {
        let root = repo_root.as_ref();

        // 1. Remove deleted files from cache
        for del in &delta.deleted {
            self.parsed_cache.remove(del);
        }

        // 2. Reparse modified files
        for mod_file in &delta.modified {
            let abs_path = root.join(mod_file.to_path_buf());
            let is_test = ghostlight_parser::is_test_file(mod_file);
            if let Ok(parsed) = extract_python_file(mod_file, &abs_path, is_test) {
                self.parsed_cache.insert(mod_file.clone(), parsed);
            }
        }

        // 3. Parse newly added files
        for add_file in &delta.added {
            let abs_path = root.join(add_file.to_path_buf());
            let is_test = ghostlight_parser::is_test_file(add_file);
            if let Ok(parsed) = extract_python_file(add_file, &abs_path, is_test) {
                self.parsed_cache.insert(add_file.clone(), parsed);
            }
        }

        self.current_fingerprint = Some(new_fingerprint);
        self.rebuild_graph()
    }

    /// Re-links graph from cached ASTs.
    pub fn rebuild_graph(&self) -> DependencyGraph {
        let files: Vec<ParsedPythonFile> = self.parsed_cache.values().cloned().collect();
        build_dependency_graph(&files)
    }

    pub fn cached_file_count(&self) -> usize {
        self.parsed_cache.len()
    }
}
