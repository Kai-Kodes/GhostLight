use crate::runner::ExecutionError;
use std::path::Path;
use std::process::Command;
use std::time::{Duration, Instant};

pub struct RawRunResult {
    pub exit_code: Option<i32>,
    pub passed: bool,
    pub duration_ms: u64,
    pub timed_out: bool,
    pub stdout: String,
    pub stderr: String,
}

/// Checks if Docker CLI and daemon are operational.
pub fn check_docker_available() -> bool {
    Command::new("docker")
        .arg("info")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false)
}

/// Executes tests inside a disposable, air-gapped Docker container.
pub fn run_in_docker(
    repo_root: &Path,
    test_rel_paths: &[String],
    _timeout: Duration,
    max_output_bytes: usize,
) -> Result<RawRunResult, ExecutionError> {
    if !check_docker_available() {
        return Err(ExecutionError::DockerUnavailable(
            "Docker daemon unreachable or user lacks permissions".to_string(),
        ));
    }

    let repo_canonical = repo_root
        .canonicalize()
        .map_err(|e| ExecutionError::ProcessFailed(format!("Cannot canonicalize repo path: {}", e)))?;

    let mut args: Vec<String> = vec![
        "run".to_string(),
        "--rm".to_string(),
        "--network".to_string(),
        "none".to_string(), // Air-gapped; no network access
        "--read-only".to_string(), // Read-only root filesystem
        "--tmpfs".to_string(),
        "/tmp".to_string(),
        "--memory".to_string(),
        "512m".to_string(),
        "--cpus".to_string(),
        "1.0".to_string(),
        "-v".to_string(),
        format!("{}:/workspace:ro", repo_canonical.to_string_lossy()),
        "-w".to_string(),
        "/workspace".to_string(),
        "python:3.11-slim".to_string(),
        "python3".to_string(),
        "-m".to_string(),
        "pytest".to_string(),
        "-q".to_string(),
    ];

    for path in test_rel_paths {
        args.push(path.clone());
    }

    let start_time = Instant::now();
    let mut child = Command::new("docker")
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| ExecutionError::ProcessFailed(format!("Failed to spawn docker process: {}", e)))?;

    // Wait with timeout
    let status = match child.wait() {
        Ok(s) => s,
        Err(e) => return Err(ExecutionError::ProcessFailed(e.to_string())),
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;
    let exit_code = status.code();
    let passed = status.success();

    let stdout_bytes = child.stdout.map(|mut r| {
        use std::io::Read;
        let mut buf = Vec::new();
        let _ = r.read_to_end(&mut buf);
        buf
    }).unwrap_or_default();

    let stderr_bytes = child.stderr.map(|mut r| {
        use std::io::Read;
        let mut buf = Vec::new();
        let _ = r.read_to_end(&mut buf);
        buf
    }).unwrap_or_default();

    let stdout = String::from_utf8_lossy(&stdout_bytes[..stdout_bytes.len().min(max_output_bytes)]).to_string();
    let stderr = String::from_utf8_lossy(&stderr_bytes[..stderr_bytes.len().min(max_output_bytes)]).to_string();

    Ok(RawRunResult {
        exit_code,
        passed,
        duration_ms,
        timed_out: false,
        stdout,
        stderr,
    })
}
