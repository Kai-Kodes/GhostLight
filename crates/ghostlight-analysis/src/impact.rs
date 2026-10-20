use crate::test_selection::{select_candidate_tests, TestCandidate};
use ghostlight_core::{FileId, NodeId, NodeKind};
use ghostlight_graph::{DependencyGraph, ExplanatoryPath, GraphQuery};
use petgraph::visit::EdgeRef;
use petgraph::Direction;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet, VecDeque};

/// Direct vs Transitive classification of change impact.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum ImpactType {
    Direct,
    Transitive,
}

/// An entity affected by a modified file or symbol.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AffectedNode {
    pub node_id: NodeId,
    pub name: String,
    pub kind: NodeKind,
    pub file_id: Option<FileId>,
    pub impact_type: ImpactType,
    pub distance: usize,
    pub explanatory_path: Option<ExplanatoryPath>,
}

/// Comprehensive change-impact report for a modified target.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImpactReport {
    pub target_id: NodeId,
    pub target_name: String,
    pub direct_count: usize,
    pub transitive_count: usize,
    pub total_affected: usize,
    pub affected_nodes: Vec<AffectedNode>,
    pub candidate_tests: Vec<TestCandidate>,
}

/// Analyzer that calculates direct and transitive impact across the dependency graph.
pub struct ImpactAnalyzer<'a> {
    graph: &'a DependencyGraph,
}

impl<'a> ImpactAnalyzer<'a> {
    pub fn new(graph: &'a DependencyGraph) -> Self {
        Self { graph }
    }

    /// Analyzes the impact of modifying a specific file.
    pub fn analyze_file_impact(&self, file_id: &FileId) -> Option<ImpactReport> {
        let file_node_id = NodeId::for_file(file_id);
        if self.graph.get_node(&file_node_id).is_none() {
            return None;
        }

        // Collect all nodes defined in this file (file itself + classes + functions)
        let file_node_indices = self.graph.nodes_for_file(file_id);
        let mut source_ids: Vec<NodeId> = file_node_indices
            .iter()
            .map(|&idx| self.graph.inner_graph()[idx].id.clone())
            .collect();

        if !source_ids.contains(&file_node_id) {
            source_ids.push(file_node_id.clone());
        }

        Some(self.calculate_impact(&file_node_id, file_id.as_str(), &source_ids))
    }

    /// Analyzes the impact of modifying a specific symbol within a file.
    pub fn analyze_symbol_impact(&self, file_id: &FileId, symbol_name: &str) -> Option<ImpactReport> {
        let sym_id = NodeId::for_symbol(file_id, symbol_name);
        if self.graph.get_node(&sym_id).is_none() {
            return None;
        }

        Some(self.calculate_impact(&sym_id, symbol_name, &[sym_id.clone()]))
    }

    fn calculate_impact(
        &self,
        target_id: &NodeId,
        target_name: &str,
        seed_node_ids: &[NodeId],
    ) -> ImpactReport {
        let query = GraphQuery::new(self.graph);
        let inner = self.graph.inner_graph();

        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        let mut distances: BTreeMap<NodeId, usize> = BTreeMap::new();

        // Initialize queue with seed nodes
        for seed_id in seed_node_ids {
            if let Some(seed_idx) = self.graph.get_node_index(seed_id) {
                visited.insert(seed_idx);
                queue.push_back((seed_idx, 0));
            }
        }

        // Multi-source BFS in reverse direction (incoming edges)
        while let Some((current_idx, dist)) = queue.pop_front() {
            for edge in inner.edges_directed(current_idx, Direction::Incoming) {
                let predecessor = edge.source();
                if visited.insert(predecessor) {
                    let next_dist = dist + 1;
                    let pred_id = inner[predecessor].id.clone();
                    distances.insert(pred_id, next_dist);
                    queue.push_back((predecessor, next_dist));
                }
            }
        }

        let mut affected_nodes = Vec::new();
        let mut direct_count = 0;
        let mut transitive_count = 0;

        for (node_id, distance) in &distances {
            let Some(node_data) = self.graph.get_node(node_id) else {
                continue;
            };

            let impact_type = if *distance == 1 {
                direct_count += 1;
                ImpactType::Direct
            } else {
                transitive_count += 1;
                ImpactType::Transitive
            };

            // Calculate explanatory path from this affected node back to target
            let path = query.shortest_path(node_id, target_id);

            affected_nodes.push(AffectedNode {
                node_id: node_id.clone(),
                name: node_data.name.clone(),
                kind: node_data.kind,
                file_id: node_data.file_id.clone(),
                impact_type,
                distance: *distance,
                explanatory_path: path,
            });
        }

        // Sort by distance (direct first), then alphabetically
        affected_nodes.sort_by(|a, b| (a.distance, &a.name).cmp(&(b.distance, &b.name)));

        let total_affected = affected_nodes.len();
        let candidate_tests = select_candidate_tests(self.graph, seed_node_ids);

        ImpactReport {
            target_id: target_id.clone(),
            target_name: target_name.to_string(),
            direct_count,
            transitive_count,
            total_affected,
            affected_nodes,
            candidate_tests,
        }
    }
}
