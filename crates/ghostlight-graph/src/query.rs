use crate::graph::DependencyGraph;
use ghostlight_core::{EdgeData, NodeData, NodeId};
use petgraph::algo::{astar, kosaraju_scc};
use petgraph::visit::EdgeRef;
use petgraph::Direction;
use serde::{Deserialize, Serialize};
use std::collections::{HashSet, VecDeque};

/// A step in an explanatory dependency path.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PathStep {
    pub from: NodeId,
    pub to: NodeId,
    pub edge: EdgeData,
}

/// An explainable path proving why a target is affected or reachable from a source.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExplanatoryPath {
    pub source: NodeId,
    pub target: NodeId,
    pub steps: Vec<PathStep>,
    pub hop_count: usize,
}

/// Traversal queries on the dependency graph.
pub struct GraphQuery<'a> {
    graph: &'a DependencyGraph,
}

impl<'a> GraphQuery<'a> {
    pub fn new(graph: &'a DependencyGraph) -> Self {
        Self { graph }
    }

    /// Computes all transitive dependencies (forward reachability: nodes this node depends on).
    pub fn transitive_dependencies(&self, root: &NodeId) -> Vec<&'a NodeData> {
        self.traverse(root, Direction::Outgoing)
    }

    /// Computes all transitive dependents / blast radius (reverse reachability: nodes that depend on this node).
    pub fn transitive_dependents(&self, root: &NodeId) -> Vec<&'a NodeData> {
        self.traverse(root, Direction::Incoming)
    }

    fn traverse(&self, root: &NodeId, dir: Direction) -> Vec<&'a NodeData> {
        let Some(root_idx) = self.graph.get_node_index(root) else {
            return Vec::new();
        };

        let inner = self.graph.inner_graph();
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        let mut results = Vec::new();

        visited.insert(root_idx);
        queue.push_back(root_idx);

        while let Some(current) = queue.pop_front() {
            for edge in inner.edges_directed(current, dir) {
                let neighbor = match dir {
                    Direction::Outgoing => edge.target(),
                    Direction::Incoming => edge.source(),
                };

                if visited.insert(neighbor) {
                    queue.push_back(neighbor);
                    results.push(&inner[neighbor]);
                }
            }
        }

        results.sort_by(|a, b| a.id.cmp(&b.id));
        results
    }

    /// Finds the shortest explanatory path between two nodes (e.g. from modified symbol to an affected test).
    pub fn shortest_path(&self, source: &NodeId, target: &NodeId) -> Option<ExplanatoryPath> {
        let src_idx = self.graph.get_node_index(source)?;
        let tgt_idx = self.graph.get_node_index(target)?;
        let inner = self.graph.inner_graph();

        let path = astar(
            inner,
            src_idx,
            |finish| finish == tgt_idx,
            |_| 1,
            |_| 0,
        )?;

        let node_indices = path.1;
        if node_indices.len() < 2 {
            return None;
        }

        let mut steps = Vec::new();
        for window in node_indices.windows(2) {
            let u = window[0];
            let v = window[1];

            // Find connecting edge
            if let Some(edge_ref) = inner.edges_connecting(u, v).next() {
                steps.push(PathStep {
                    from: inner[u].id.clone(),
                    to: inner[v].id.clone(),
                    edge: edge_ref.weight().clone(),
                });
            }
        }

        let hop_count = steps.len();
        Some(ExplanatoryPath {
            source: source.clone(),
            target: target.clone(),
            steps,
            hop_count,
        })
    }

    /// Finds cycles in the graph using Strongly Connected Components (SCC).
    pub fn find_cycles(&self) -> Vec<Vec<NodeId>> {
        let inner = self.graph.inner_graph();
        let sccs = kosaraju_scc(inner);
        let mut cycles = Vec::new();

        for scc in sccs {
            if scc.len() > 1 {
                let mut cycle_nodes: Vec<NodeId> = scc.into_iter().map(|idx| inner[idx].id.clone()).collect();
                cycle_nodes.sort();
                cycles.push(cycle_nodes);
            }
        }

        cycles.sort_by(|a, b| a.first().cmp(&b.first()));
        cycles
    }

    /// Extracts a k-hop neighborhood around a focal node for localized graph visualization.
    pub fn k_hop_neighborhood(&self, center: &NodeId, k: usize) -> Vec<&'a NodeData> {
        let Some(center_idx) = self.graph.get_node_index(center) else {
            return Vec::new();
        };

        let inner = self.graph.inner_graph();
        let mut visited = HashSet::new();
        let mut current_layer = vec![center_idx];
        visited.insert(center_idx);

        for _ in 0..k {
            let mut next_layer = Vec::new();
            for &idx in &current_layer {
                // Explore both incoming and outgoing
                for edge in inner.edges_directed(idx, Direction::Outgoing) {
                    if visited.insert(edge.target()) {
                        next_layer.push(edge.target());
                    }
                }
                for edge in inner.edges_directed(idx, Direction::Incoming) {
                    if visited.insert(edge.source()) {
                        next_layer.push(edge.source());
                    }
                }
            }
            if next_layer.is_empty() {
                break;
            }
            current_layer = next_layer;
        }

        let mut results: Vec<&'a NodeData> = visited.into_iter().map(|idx| &inner[idx]).collect();
        results.sort_by(|a, b| a.id.cmp(&b.id));
        results
    }
}
