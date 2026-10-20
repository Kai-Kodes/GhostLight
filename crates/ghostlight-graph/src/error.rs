use ghostlight_core::NodeId;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GraphError {
    #[error("Node not found in graph: {0}")]
    NodeNotFound(NodeId),

    #[error("Cycle detected involving nodes: {0:?}")]
    CycleDetected(Vec<NodeId>),

    #[error("Graph serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}
