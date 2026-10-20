use crate::id::{FileId, NodeId};
use crate::location::SourceRange;
use serde::{Deserialize, Serialize};

/// Semantic category of a node in the dependency graph.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum NodeKind {
    File,
    Module,
    Package,
    Function,
    Method,
    Class,
    Test,
    ExternalModule,
}

/// Typed relationship edge between nodes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum EdgeType {
    /// File or module imports another file or module
    Imports,
    /// Parent container defines a symbol (file defines function, class defines method)
    Defines,
    /// Function or method calls another function or method
    Calls,
    /// Class inherits from a base class
    Inherits,
    /// General identifier reference or type annotation
    References,
}

/// Evidential confidence of an edge or conclusion.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum Confidence {
    /// Formally proven via static syntax and scope resolution
    Static,
    /// Inferred via strong structural conventions (e.g. naming patterns, file tree)
    Heuristic,
    /// Unresolved or ambiguous dynamic reference (never disguised as fact)
    Uncertain,
}

/// Resolution status for symbols and imports.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum ResolutionStatus {
    /// Successfully bound to an internal target
    Resolved,
    /// Multiple possible candidates match
    Ambiguous,
    /// Target not found within the repository (e.g. standard library, external pip pkg)
    Unresolved,
}

/// Symbol visibility.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum SymbolVisibility {
    Public,
    Protected,
    Private,
}

/// Rich metadata attached to a graph node.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NodeData {
    pub id: NodeId,
    pub name: String,
    pub kind: NodeKind,
    pub file_id: Option<FileId>,
    pub range: Option<SourceRange>,
    pub visibility: SymbolVisibility,
    pub docstring: Option<String>,
    pub is_test: bool,
}

impl NodeData {
    pub fn new_file(file_id: FileId, is_test: bool) -> Self {
        let name = file_id.as_str().to_string();
        let id = NodeId::for_file(&file_id);
        Self {
            id,
            name,
            kind: NodeKind::File,
            file_id: Some(file_id),
            range: None,
            visibility: SymbolVisibility::Public,
            docstring: None,
            is_test,
        }
    }

    pub fn new_symbol(
        file_id: FileId,
        symbol_name: String,
        kind: NodeKind,
        range: Option<SourceRange>,
        visibility: SymbolVisibility,
        docstring: Option<String>,
        is_test: bool,
    ) -> Self {
        let id = NodeId::for_symbol(&file_id, &symbol_name);
        Self {
            id,
            name: symbol_name,
            kind,
            file_id: Some(file_id),
            range,
            visibility,
            docstring,
            is_test,
        }
    }
}

/// Metadata attached to a directed graph edge.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EdgeData {
    pub edge_type: EdgeType,
    pub confidence: Confidence,
    pub resolution: ResolutionStatus,
    pub range: Option<SourceRange>,
}

impl EdgeData {
    pub fn new(edge_type: EdgeType, confidence: Confidence, resolution: ResolutionStatus) -> Self {
        Self {
            edge_type,
            confidence,
            resolution,
            range: None,
        }
    }

    pub fn with_range(mut self, range: SourceRange) -> Self {
        self.range = Some(range);
        self
    }
}
