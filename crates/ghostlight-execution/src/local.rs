use crate::docker::RawRunResult;
use crate::runner::ExecutionError;
use std::io::Read;
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

#[cfg(unix)]
use std::os::unix::process::CommandExt;

/// Runs tests using local Python environment with security controls and timeouts.
pub fn run_local_subprocess(
    repo_root: &Path,
    test_rel_paths: &[String],
    timeout: Duration,
    max_output_bytes: usize,
) -> Result<RawRunResult, ExecutionError> {
    let mut cmd = Command::new("python3");
    cmd.current_dir(repo_root);
    cmd.env("PYTHONPATH", ".");
    cmd.env("PYTHONDONTWRITEBYTECODE", "1");
    cmd.arg("-m");
    cmd.arg("pytest");
    cmd.arg("-q");

    for path in test_rel_paths {
        cmd.arg(path);
    }

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    #[cfg(unix)]
    {
        // Place child in its own process group to allow killing entire process tree
        cmd.process_group(0);
    }

    let start_time = Instant::now();
    let mut child = cmd
        .spawn()
        .map_err(|e| ExecutionError::ProcessFailed(format!("Failed to spawn python3: {}", e)))?;

    // Poll with timeout
    let mut timed_out = false;
    let poll_interval = Duration::from_millis(50);
    let mut elapsed = Duration::from_millis(0);

    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {
                std::thread::sleep(poll_interval);
                elapsed += poll_interval;
                if elapsed >= timeout {
                    timed_out = true;
                    #[cfg(unix)]
                    unsafe {
                        // Kill process group
                        let pid = child.id() as i32;
                        libc::kill(-pid, libc::SIGKILL);
                    }
                    let _ = child.kill();
                    break child.wait().unwrap_or_else(|_| {
                        // Synthetic failed exit status
                        std::process::ExitStatus::default()
                    });
                }
            }
            Err(e) => return Err(ExecutionError::ProcessFailed(e.to_string())),
        }
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;
    let exit_code = status.code();
    let passed = !timed_out && status.success();

    let mut stdout_buf = Vec::new();
    if let Some(mut out) = child.stdout {
        let _ = out.read_to_end(&mut stdout_buf);
    }

    let mut stderr_buf = Vec::new();
    if let Some(mut err) = child.stderr {
        let _ = err.read_to_end(&mut stderr_buf);
    }

    let stdout = String::from_utf8_lossy(&stdout_buf[..stdout_buf.len().min(max_output_bytes)]).to_string();
    let stderr = String::from_utf8_lossy(&stderr_buf[..stderr_buf.len().min(max_output_bytes)]).to_string();

    Ok(RawRunResult {
        exit_code,
        passed,
        duration_ms,
        timed_out,
        stdout,
        stderr,
    })
}
