use serde::{Deserialize, Serialize};
use std::fmt;
use std::path::{Path, PathBuf};

/// A normalized, repository-relative file identifier.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct FileId(String);

impl FileId {
    /// Creates a new `FileId` by normalizing path separators to forward slashes.
    pub fn new<P: AsRef<Path>>(repo_root: &Path, absolute_path: P) -> Self {
        let abs = absolute_path.as_ref();
        let rel = match abs.strip_prefix(repo_root) {
            Ok(p) => p,
            Err(_) => abs,
        };
        Self::from_relative_path(rel)
    }

    /// Creates a `FileId` directly from a relative path.
    pub fn from_relative_path<P: AsRef<Path>>(path: P) -> Self {
        let path_str = path.as_ref().to_string_lossy();
        let normalized = path_str.replace('\\', "/");
        // Trim leading "./" or "/"
        let clean = normalized
            .trim_start_matches("./")
            .trim_start_matches('/')
            .to_string();
        Self(clean)
    }

    /// Returns the raw normalized string slice.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Returns a PathBuf representation.
    pub fn to_path_buf(&self) -> PathBuf {
        PathBuf::from(&self.0)
    }

    /// Returns the file extension if any.
    pub fn extension(&self) -> Option<&str> {
        Path::new(&self.0).extension().and_then(|s| s.to_str())
    }

    /// Returns the file stem (file name without extension).
    pub fn file_stem(&self) -> Option<&str> {
        Path::new(&self.0).file_stem().and_then(|s| s.to_str())
    }

    /// Converts file path into a Python module path heuristic (e.g. `foo/bar.py` -> `foo.bar`).
    pub fn to_python_module_name(&self) -> String {
        let s = &self.0;
        let trimmed = s.strip_suffix(".py").unwrap_or(s);
        let trimmed = trimmed.strip_suffix("/__init__").unwrap_or(trimmed);
        trimmed.replace('/', ".")
    }
}

impl fmt::Display for FileId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A scoped symbol identifier within a file (e.g., `Class::method` or `function_name`).
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct SymbolId(String);

impl SymbolId {
    pub fn new<S: Into<String>>(id: S) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for SymbolId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A globally unique, deterministic node identifier in the dependency graph.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct NodeId(String);

impl NodeId {
    /// Constructs a file node ID.
    pub fn for_file(file_id: &FileId) -> Self {
        Self(format!("file:{}", file_id.as_str()))
    }

    /// Constructs a symbol node ID scoped to a file.
    pub fn for_symbol(file_id: &FileId, symbol: &str) -> Self {
        Self(format!("symbol:{}::{}", file_id.as_str(), symbol))
    }

    /// Constructs an external or synthetic node ID.
    pub fn for_external(module_path: &str) -> Self {
        Self(format!("external:{}", module_path))
    }

    /// Returns the raw node identifier string.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Checks if this node represents a file.
    pub fn is_file(&self) -> bool {
        self.0.starts_with("file:")
    }

    /// Checks if this node represents a symbol.
    pub fn is_symbol(&self) -> bool {
        self.0.starts_with("symbol:")
    }

    /// Extracts the associated FileId if this is a file or symbol node.
    pub fn file_id(&self) -> Option<FileId> {
        if self.0.starts_with("file:") {
            Some(FileId::from_relative_path(&self.0["file:".len()..]))
        } else if self.0.starts_with("symbol:") {
            let rest = &self.0["symbol:".len()..];
            let file_part = rest.split("::").next()?;
            Some(FileId::from_relative_path(file_part))
        } else {
            None
        }
    }
}

impl fmt::Display for NodeId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_id_normalization() {
        let id = FileId::from_relative_path("foo/bar\\baz.py");
        assert_eq!(id.as_str(), "foo/bar/baz.py");
        assert_eq!(id.to_python_module_name(), "foo.bar.baz");

        let init = FileId::from_relative_path("mypackage/__init__.py");
        assert_eq!(init.to_python_module_name(), "mypackage");
    }

    #[test]
    fn test_node_id_construction() {
        let f = FileId::from_relative_path("src/core.py");
        let file_node = NodeId::for_file(&f);
        let sym_node = NodeId::for_symbol(&f, "Engine::start");

        assert_eq!(file_node.as_str(), "file:src/core.py");
        assert_eq!(sym_node.as_str(), "symbol:src/core.py::Engine::start");
        assert_eq!(sym_node.file_id(), Some(f.clone()));
        assert_eq!(file_node.file_id(), Some(f));
    }
}
