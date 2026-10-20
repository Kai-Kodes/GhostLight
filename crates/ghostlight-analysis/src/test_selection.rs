use ghostlight_core::{Confidence, FileId, NodeId};
use ghostlight_graph::{DependencyGraph, ExplanatoryPath, GraphQuery};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// The reason why a candidate test was selected by the analysis engine.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SelectionReason {
    /// Test function or method directly calls the modified symbol
    DirectCall,
    /// Test function or method transitively calls the modified symbol through downstream dependencies
    TransitiveCall,
    /// Test file directly imports the modified module or symbol
    DirectImport,
    /// Test file name conventionally matches the modified file (e.g. `foo.py` -> `test_foo.py`)
    NamingConvention,
}

/// A test identified as potentially affected by a code modification.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TestCandidate {
    pub test_node_id: NodeId,
    pub file_id: FileId,
    pub symbol_name: String,
    pub reason: SelectionReason,
    pub confidence: Confidence,
    pub explanatory_path: Option<ExplanatoryPath>,
}

/// Selects candidate tests affected by a set of modified files or symbols.
pub fn select_candidate_tests(
    graph: &DependencyGraph,
    changed_node_ids: &[NodeId],
) -> Vec<TestCandidate> {
    let query = GraphQuery::new(graph);
    let mut candidates_map: BTreeMap<NodeId, TestCandidate> = BTreeMap::new();

    for changed_id in changed_node_ids {
        // Find all reverse dependencies (dependents)
        let dependents = query.transitive_dependents(changed_id);

        for dep_node in dependents {
            if dep_node.is_test {
                let file_id = dep_node.file_id.clone().unwrap_or_else(|| {
                    FileId::from_relative_path("unknown.py")
                });

                // Find explanatory path from test to changed node
                let path = query.shortest_path(&dep_node.id, changed_id);

                let reason = if let Some(p) = &path {
                    if p.hop_count == 1 {
                        SelectionReason::DirectCall
                    } else {
                        SelectionReason::TransitiveCall
                    }
                } else {
                    SelectionReason::DirectImport
                };

                let candidate = TestCandidate {
                    test_node_id: dep_node.id.clone(),
                    file_id,
                    symbol_name: dep_node.name.clone(),
                    reason,
                    confidence: Confidence::Static,
                    explanatory_path: path,
                };

                candidates_map.insert(dep_node.id.clone(), candidate);
            }
        }

        // Also check naming convention heuristic if changed_id is a file
        if let Some(file_id) = changed_id.file_id() {
            let stem = file_id.file_stem().unwrap_or("");
            if !stem.is_empty() && !stem.starts_with("test_") {
                let candidate_test_names = [
                    format!("tests/test_{}.py", stem),
                    format!("test_{}.py", stem),
                    format!("tests/{}_test.py", stem),
                ];

                for test_path in candidate_test_names {
                    let test_file_id = FileId::from_relative_path(&test_path);
                    let test_node_id = NodeId::for_file(&test_file_id);
                    if let Some(node) = graph.get_node(&test_node_id) {
                        if !candidates_map.contains_key(&test_node_id) {
                            candidates_map.insert(
                                test_node_id.clone(),
                                TestCandidate {
                                    test_node_id: test_node_id.clone(),
                                    file_id: test_file_id,
                                    symbol_name: node.name.clone(),
                                    reason: SelectionReason::NamingConvention,
                                    confidence: Confidence::Heuristic,
                                    explanatory_path: None,
                                },
                            );
                        }
                    }
                }
            }
        }
    }

    let mut result: Vec<TestCandidate> = candidates_map.into_values().collect();
    result.sort_by(|a, b| a.test_node_id.cmp(&b.test_node_id));
    result
}
