//! Impact analysis, test selection, and differential analysis.
pub mod diff;
pub mod impact;
pub mod report;
pub mod test_selection;

pub use diff::{IncrementalEngine, RepositoryDelta};
pub use impact::{AffectedNode, ImpactAnalyzer, ImpactReport, ImpactType};
pub use report::{AnalysisReport, RepositoryMetrics};
pub use test_selection::{select_candidate_tests, SelectionReason, TestCandidate};
