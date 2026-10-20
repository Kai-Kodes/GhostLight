use crate::impact::ImpactReport;
use crate::test_selection::TestCandidate;
use ghostlight_core::RepositoryFingerprint;
use ghostlight_graph::{DependencyGraph, GraphQuery};
use serde::{Deserialize, Serialize};

/// High-level metrics describing repository graph structure.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RepositoryMetrics {
    pub file_count: usize,
    pub total_nodes: usize,
    pub total_edges: usize,
    pub detected_cycles: usize,
}

/// Versioned, comprehensive analysis report.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisReport {
    pub schema_version: String,
    pub repository_root: String,
    pub fingerprint: RepositoryFingerprint,
    pub metrics: RepositoryMetrics,
    pub impact: Option<ImpactReport>,
    pub candidate_tests: Vec<TestCandidate>,
}

impl AnalysisReport {
    pub const SCHEMA_VERSION: &'static str = "1.0.0";

    pub fn new(
        repository_root: String,
        fingerprint: RepositoryFingerprint,
        graph: &DependencyGraph,
        impact: Option<ImpactReport>,
        candidate_tests: Vec<TestCandidate>,
    ) -> Self {
        let query = GraphQuery::new(graph);
        let cycles = query.find_cycles();

        let metrics = RepositoryMetrics {
            file_count: fingerprint.file_count,
            total_nodes: graph.node_count(),
            total_edges: graph.edge_count(),
            detected_cycles: cycles.len(),
        };

        Self {
            schema_version: Self::SCHEMA_VERSION.to_string(),
            repository_root,
            fingerprint,
            metrics,
            impact,
            candidate_tests,
        }
    }

    /// Serializes report to formatted JSON.
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Renders an executive Markdown summary.
    pub fn to_markdown(&self) -> String {
        let mut md = String::new();
        md.push_str("# GHOSTLIGHT Codebase Intelligence & Impact Report\n\n");
        md.push_str(&format!("- **Schema Version:** {}\n", self.schema_version));
        md.push_str(&format!("- **Repository Root:** `{}`\n", self.repository_root));
        md.push_str(&format!("- **Root Fingerprint:** `{}`\n", self.fingerprint.root_hash));
        md.push_str(&format!("- **Scanned Python Files:** {}\n", self.metrics.file_count));
        md.push_str(&format!("- **Total Graph Nodes:** {}\n", self.metrics.total_nodes));
        md.push_str(&format!("- **Total Graph Edges:** {}\n", self.metrics.total_edges));
        md.push_str(&format!("- **Detected Cycles:** {}\n\n", self.metrics.detected_cycles));

        if let Some(impact) = &self.impact {
            md.push_str("## Change Impact Analysis\n\n");
            md.push_str(&format!("- **Modified Target:** `{}`\n", impact.target_name));
            md.push_str(&format!("- **Direct Downstream Impact:** {}\n", impact.direct_count));
            md.push_str(&format!("- **Transitive Ripple Impact:** {}\n", impact.transitive_count));
            md.push_str(&format!("- **Total Affected Entities:** {}\n\n", impact.total_affected));

            if !impact.affected_nodes.is_empty() {
                md.push_str("### Affected Nodes & Explanations\n\n");
                md.push_str("| Node Name | Kind | Impact Type | Distance | Location |\n");
                md.push_str("| :--- | :--- | :--- | :--- | :--- |\n");
                for node in &impact.affected_nodes {
                    let loc = node.file_id.as_ref().map(|f| f.as_str()).unwrap_or("-");
                    md.push_str(&format!(
                        "| `{}` | `{:?}` | `{:?}` | {} | `{}` |\n",
                        node.name, node.kind, node.impact_type, node.distance, loc
                    ));
                }
                md.push('\n');
            }
        }

        if !self.candidate_tests.is_empty() {
            md.push_str("## Candidate Affected Tests\n\n");
            md.push_str("| Test Symbol | File | Selection Reason | Confidence |\n");
            md.push_str("| :--- | :--- | :--- | :--- |\n");
            for test in &self.candidate_tests {
                md.push_str(&format!(
                    "| `{}` | `{}` | `{:?}` | `{:?}` |\n",
                    test.symbol_name, test.file_id, test.reason, test.confidence
                ));
            }
            md.push('\n');
        }

        md
    }
}
