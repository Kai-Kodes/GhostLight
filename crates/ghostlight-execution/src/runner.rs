use ghostlight_analysis::TestCandidate;
use ghostlight_core::FileId;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Duration;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ExecutionError {
    #[error("Execution unauthorized: Safe test execution requires explicit user authorization")]
    Unauthorized,

    #[error("Docker isolation is unavailable on this system and local execution was not authorized: {0}")]
    DockerUnavailable(String),

    #[error("Security violation: Test target path {0:?} escapes repository root or is invalid")]
    InvalidTargetPath(PathBuf),

    #[error("Process execution failed: {0}")]
    ProcessFailed(String),

    #[error("Test execution timed out after {0:?}")]
    TimedOut(Duration),

    #[error("I/O error during execution: {0}")]
    Io(#[from] std::io::Error),
}

/// Execution mode for running tests.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ExecutionEngine {
    /// Isolated, air-gapped Docker container
    Docker,
    /// Local subprocess with security bounds and process group termination
    RestrictedSubprocess,
}

/// Comparison between static prediction and observed runtime test execution.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PredictionComparison {
    pub candidate_test: String,
    pub selection_reason: String,
    pub observed_passed: bool,
    pub execution_confirmed: bool,
    pub notes: String,
}

/// Execution result for a test run.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TestRunResult {
    pub engine_used: ExecutionEngine,
    pub is_isolated: bool,
    pub exit_code: Option<i32>,
    pub passed: bool,
    pub duration_ms: u64,
    pub timed_out: bool,
    pub stdout: String,
    pub stderr: String,
    pub comparisons: Vec<PredictionComparison>,
}

/// Test runner coordinating safe, explicitly authorized test runs.
pub struct TestRunner {
    repo_root: PathBuf,
    timeout: Duration,
    max_output_bytes: usize,
}

impl TestRunner {
    pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);
    pub const DEFAULT_MAX_OUTPUT: usize = 1024 * 1024; // 1 MB

    pub fn new<P: AsRef<Path>>(repo_root: P) -> Self {
        Self {
            repo_root: repo_root.as_ref().to_path_buf(),
            timeout: Self::DEFAULT_TIMEOUT,
            max_output_bytes: Self::DEFAULT_MAX_OUTPUT,
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// Verifies whether Docker is installed and accessible.
    pub fn is_docker_available(&self) -> bool {
        crate::docker::check_docker_available()
    }

    /// Runs candidate tests with explicit user authorization.
    pub fn execute_tests(
        &self,
        candidate_tests: &[TestCandidate],
        authorized: bool,
        prefer_docker: bool,
    ) -> Result<TestRunResult, ExecutionError> {
        if !authorized {
            return Err(ExecutionError::Unauthorized);
        }

        if candidate_tests.is_empty() {
            return Ok(TestRunResult {
                engine_used: ExecutionEngine::RestrictedSubprocess,
                is_isolated: true,
                exit_code: Some(0),
                passed: true,
                duration_ms: 0,
                timed_out: false,
                stdout: "No candidate tests were selected for execution.".to_string(),
                stderr: String::new(),
                comparisons: Vec::new(),
            });
        }

        // Validate all test files strictly within repository
        let mut test_rel_paths: Vec<String> = Vec::new();
        for candidate in candidate_tests {
            let rel = candidate.file_id.as_str();
            let path_obj = Path::new(rel);

            // Block any path traversal attempts (ParentDir components, absolute paths)
            let has_parent_dir = path_obj.components().any(|c| matches!(c, std::path::Component::ParentDir));
            if has_parent_dir || path_obj.is_absolute() || !rel.ends_with(".py") {
                return Err(ExecutionError::InvalidTargetPath(PathBuf::from(rel)));
            }

            let full_path = self.repo_root.join(rel);
            if !test_rel_paths.contains(&rel.to_string()) {
                test_rel_paths.push(rel.to_string());
            }
        }

        let use_docker = prefer_docker && self.is_docker_available();

        let raw_result = if use_docker {
            crate::docker::run_in_docker(
                &self.repo_root,
                &test_rel_paths,
                self.timeout,
                self.max_output_bytes,
            )?
        } else {
            crate::local::run_local_subprocess(
                &self.repo_root,
                &test_rel_paths,
                self.timeout,
                self.max_output_bytes,
            )?
        };

        // Reconcile predictions vs observed facts
        let mut comparisons = Vec::new();
        for candidate in candidate_tests {
            let test_name = format!("{}::{}", candidate.file_id, candidate.symbol_name);
            let observed_passed = raw_result.passed;
            let note = if raw_result.passed {
                "Static candidate test executed and passed".to_string()
            } else {
                "Static candidate test executed and failed or threw error".to_string()
            };

            comparisons.push(PredictionComparison {
                candidate_test: test_name,
                selection_reason: format!("{:?}", candidate.reason),
                observed_passed,
                execution_confirmed: true,
                notes: note,
            });
        }

        Ok(TestRunResult {
            engine_used: if use_docker {
                ExecutionEngine::Docker
            } else {
                ExecutionEngine::RestrictedSubprocess
            },
            is_isolated: use_docker,
            exit_code: raw_result.exit_code,
            passed: raw_result.passed,
            duration_ms: raw_result.duration_ms,
            timed_out: raw_result.timed_out,
            stdout: raw_result.stdout,
            stderr: raw_result.stderr,
            comparisons,
        })
    }
}
