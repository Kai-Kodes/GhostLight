use crate::error::GraphError;
use ghostlight_core::{EdgeData, EdgeType, FileId, NodeData, NodeId, NodeKind};
use petgraph::graph::{DiGraph, EdgeIndex, NodeIndex};
use petgraph::visit::EdgeRef;
use petgraph::Direction;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Serializable summary representation of a graph node for CLI/UI/IPC.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GraphNodeDto {
    pub id: String,
    pub label: String,
    pub kind: NodeKind,
    pub file_id: Option<String>,
    pub is_test: bool,
}

/// Serializable representation of a graph edge.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GraphEdgeDto {
    pub source: String,
    pub target: String,
    pub edge_type: EdgeType,
    pub confidence: ghostlight_core::Confidence,
    pub resolution: ghostlight_core::ResolutionStatus,
}

/// Complete graph exported for frontend / Cytoscape consumption.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GraphExportDto {
    pub nodes: Vec<GraphNodeDto>,
    pub edges: Vec<GraphEdgeDto>,
    pub node_count: usize,
    pub edge_count: usize,
}

/// Directed multi-graph representing software architecture and dependencies.
#[derive(Debug, Clone)]
pub struct DependencyGraph {
    graph: DiGraph<NodeData, EdgeData>,
    node_map: BTreeMap<NodeId, NodeIndex>,
    file_nodes: BTreeMap<FileId, Vec<NodeIndex>>,
    symbol_nodes: BTreeMap<String, Vec<NodeIndex>>,
    module_index: BTreeMap<String, FileId>,
}

impl Default for DependencyGraph {
    fn default() -> Self {
        Self::new()
    }
}

impl DependencyGraph {
    pub fn new() -> Self {
        Self {
            graph: DiGraph::new(),
            node_map: BTreeMap::new(),
            file_nodes: BTreeMap::new(),
            symbol_nodes: BTreeMap::new(),
            module_index: BTreeMap::new(),
        }
    }

    /// Total number of nodes.
    pub fn node_count(&self) -> usize {
        self.graph.node_count()
    }

    /// Total number of edges.
    pub fn edge_count(&self) -> usize {
        self.graph.edge_count()
    }

    /// Adds or gets a node in the graph, keeping index mappings synchronized.
    pub fn add_or_update_node(&mut self, data: NodeData) -> NodeIndex {
        if let Some(&idx) = self.node_map.get(&data.id) {
            self.graph[idx] = data;
            return idx;
        }

        let node_id = data.id.clone();
        let file_id = data.file_id.clone();
        let name = data.name.clone();

        let idx = self.graph.add_node(data);
        self.node_map.insert(node_id, idx);

        if let Some(fid) = file_id {
            self.file_nodes.entry(fid).or_default().push(idx);
        }

        self.symbol_nodes.entry(name).or_default().push(idx);

        idx
    }

    /// Registers a Python module name mapping to a file (e.g. `foo.bar` -> `src/foo/bar.py`).
    pub fn register_module(&mut self, module_name: String, file_id: FileId) {
        self.module_index.insert(module_name, file_id);
    }

    /// Resolves a Python module name to a registered file_id.
    pub fn resolve_module(&self, module_name: &str) -> Option<&FileId> {
        self.module_index.get(module_name)
    }

    /// Adds a typed edge between two nodes if not already present.
    pub fn add_edge(
        &mut self,
        source: &NodeId,
        target: &NodeId,
        edge_data: EdgeData,
    ) -> Result<EdgeIndex, GraphError> {
        let src_idx = self
            .node_map
            .get(source)
            .copied()
            .ok_or_else(|| GraphError::NodeNotFound(source.clone()))?;
        let tgt_idx = self
            .node_map
            .get(target)
            .copied()
            .ok_or_else(|| GraphError::NodeNotFound(target.clone()))?;

        // Prevent duplicate edges of the same type between identical nodes
        for edge_ref in self.graph.edges_connecting(src_idx, tgt_idx) {
            if edge_ref.weight().edge_type == edge_data.edge_type {
                return Ok(edge_ref.id());
            }
        }

        Ok(self.graph.add_edge(src_idx, tgt_idx, edge_data))
    }

    /// Retrieves node data by NodeId.
    pub fn get_node(&self, id: &NodeId) -> Option<&NodeData> {
        let idx = self.node_map.get(id)?;
        self.graph.node_weight(*idx)
    }

    /// Returns NodeIndex for a given NodeId.
    pub fn get_node_index(&self, id: &NodeId) -> Option<NodeIndex> {
        self.node_map.get(id).copied()
    }

    /// Returns reference to internal petgraph graph.
    pub fn inner_graph(&self) -> &DiGraph<NodeData, EdgeData> {
        &self.graph
    }

    /// Returns all node indices belonging to a file.
    pub fn nodes_for_file(&self, file_id: &FileId) -> &[NodeIndex] {
        self.file_nodes
            .get(file_id)
            .map(|v| v.as_slice())
            .unwrap_or(&[])
    }

    /// Returns all node indices matching a symbol name.
    pub fn nodes_for_symbol(&self, name: &str) -> &[NodeIndex] {
        self.symbol_nodes
            .get(name)
            .map(|v| v.as_slice())
            .unwrap_or(&[])
    }

    /// Returns direct outgoing dependencies of a node.
    pub fn direct_dependencies(&self, node_id: &NodeId) -> Vec<(&NodeData, &EdgeData)> {
        let Some(&idx) = self.node_map.get(node_id) else {
            return Vec::new();
        };

        let mut results = Vec::new();
        for edge in self.graph.edges_directed(idx, Direction::Outgoing) {
            let target_node = &self.graph[edge.target()];
            let edge_data = edge.weight();
            results.push((target_node, edge_data));
        }
        results
    }

    /// Returns direct incoming dependents (reverse dependencies / blast radius) of a node.
    pub fn direct_dependents(&self, node_id: &NodeId) -> Vec<(&NodeData, &EdgeData)> {
        let Some(&idx) = self.node_map.get(node_id) else {
            return Vec::new();
        };

        let mut results = Vec::new();
        for edge in self.graph.edges_directed(idx, Direction::Incoming) {
            let source_node = &self.graph[edge.source()];
            let edge_data = edge.weight();
            results.push((source_node, edge_data));
        }
        results
    }

    /// Returns all nodes in the graph in deterministic order.
    pub fn all_nodes(&self) -> Vec<&NodeData> {
        let mut list: Vec<&NodeData> = self
            .node_map
            .values()
            .map(|&idx| &self.graph[idx])
            .collect();
        list.sort_by(|a, b| a.id.cmp(&b.id));
        list
    }

    /// Exports graph as a JSON-serializable DTO for frontend visualization.
    pub fn export_dto(&self) -> GraphExportDto {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        for &idx in self.node_map.values() {
            let data = &self.graph[idx];
            nodes.push(GraphNodeDto {
                id: data.id.as_str().to_string(),
                label: data.name.clone(),
                kind: data.kind,
                file_id: data.file_id.as_ref().map(|f| f.as_str().to_string()),
                is_test: data.is_test,
            });

            for edge in self.graph.edges_directed(idx, Direction::Outgoing) {
                let target_data = &self.graph[edge.target()];
                edges.push(GraphEdgeDto {
                    source: data.id.as_str().to_string(),
                    target: target_data.id.as_str().to_string(),
                    edge_type: edge.weight().edge_type,
                    confidence: edge.weight().confidence,
                    resolution: edge.weight().resolution,
                });
            }
        }

        nodes.sort_by(|a, b| a.id.cmp(&b.id));
        edges.sort_by(|a, b| (&a.source, &a.target).cmp(&(&b.source, &b.target)));

        let node_count = nodes.len();
        let edge_count = edges.len();

        GraphExportDto {
            nodes,
            edges,
            node_count,
            edge_count,
        }
    }
}
