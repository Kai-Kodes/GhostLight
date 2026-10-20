//! Core domain types for GHOSTLIGHT codebase intelligence.
pub mod hash;
pub mod id;
pub mod location;
pub mod model;

pub use hash::{ContentHash, RepositoryFingerprint};
pub use id::{FileId, NodeId, SymbolId};
pub use location::{SourceLocation, SourceRange, SourceSpan};
pub use model::{
    Confidence, EdgeData, EdgeType, NodeData, NodeKind, ResolutionStatus, SymbolVisibility,
};
