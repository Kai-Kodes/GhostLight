//! Safe, authorized test execution engine.
pub mod docker;
pub mod local;
pub mod runner;

pub use runner::{
    ExecutionEngine, ExecutionError, PredictionComparison, TestRunResult, TestRunner,
};
