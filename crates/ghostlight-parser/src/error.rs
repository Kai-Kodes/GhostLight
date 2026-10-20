use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ParserError {
    #[error("I/O error at {path:?}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("File exceeds maximum allowed size ({size} > {max_size} bytes): {path:?}")]
    FileTooLarge {
        path: PathBuf,
        size: u64,
        max_size: u64,
    },

    #[error("Symlink escape detected: {path:?} targets {target:?} which is outside repository root {root:?}")]
    SymlinkEscape {
        path: PathBuf,
        target: PathBuf,
        root: PathBuf,
    },

    #[error("Tree-sitter parser failed to initialize language grammar")]
    LanguageInitFailed,

    #[error("Failed to parse file {path:?}")]
    ParseFailed { path: PathBuf },

    #[error("AST recursion limit exceeded at depth {depth}")]
    RecursionLimitExceeded { depth: usize },
}
