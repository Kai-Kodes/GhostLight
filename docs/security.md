# GHOSTLIGHT: Threat Model & Security Specification

## 1. Threat Environment & Assumptions

GHOSTLIGHT is designed to inspect potentially untrusted third-party codebases, open-source repositories, and developer pull requests. Untrusted repositories must be treated as hostile inputs.

### Core Security Tenet
> **Static analysis must never execute repository code, spawn arbitrary processes, or allow repository files to compromise host integrity or privacy.**

---

## 2. Threat Categories and Mitigations

### 2.1. Arbitrary Code Execution via Repository Scanning
- **Threat**: Python repositories may contain setup hooks (`setup.py`, `pip install`, `pth` files, malicious imports).
- **Mitigation**: GHOSTLIGHT uses Tree-sitter (a purely static C/Rust syntax parser). The Python interpreter is **never** invoked during parsing, scanning, graph construction, or impact analysis.
- **Rule**: No dynamic evaluation (`eval`, `exec`, `importlib`, or `python -m`) during analysis.

### 2.2. Filesystem Traversal & Symlink Attacks
- **Threat**: A malicious repository may contain directory symlinks pointing to `/etc`, `~/.ssh`, or parent directories (`../../`), tricking the scanner into reading sensitive files or causing infinite recursion loops via circular symlinks.
- **Mitigation**:
  1. Canonical path checking: Every file path must resolve strictly within the repository canonical root.
  2. Symlink policy: By default, symlinks pointing outside the repository root are ignored and logged as security warnings.
  3. Cycle detection: Visited `(dev, ino)` pairs are tracked during directory traversal to abort circular loops immediately.

### 2.3. Resource Exhaustion & Denial of Service (DoS)
- **Threat**: Zip-bombs, million-line generated files, deeply nested expressions (`(((((...))))`), or recursive circular imports designed to blow the stack or consume all RAM.
- **Mitigation**:
  1. Maximum file size cap: Files exceeding 5MB are skipped with a warning.
  2. Maximum recursion depth: AST traversal enforces a maximum depth limit (default 256).
  3. Traversal timeout & node budget: Graph exploration and BFS/Dijkstra limits maximum visited nodes per query.
  4. Memory-bounded data structures: No unbounded buffers. Output streams (stdout/stderr during test runs) are truncated at 1MB.

### 2.4. Malicious Test Execution & Process Injection
- **Threat**: An attacker tricks the developer into running "affected tests" that execute payload code (`os.system("curl ...")`).
- **Mitigation**:
  1. **Zero Automatic Execution**: Test execution is never triggered implicitly by a scan or UI load. It requires an explicit user authorization action (`--execute` or manual button press).
  2. **Isolated Docker Containerization**: When Docker is available, tests run with:
     - `--network none` (air-gapped; no external exfiltration).
     - `--read-only` root filesystem.
     - `--cap-drop=ALL` (drops all Linux capabilities).
     - `--user 1000:1000` (non-root execution).
     - `--memory 512m --cpus 1.0` (resource limits).
     - Explicit execution timeout (e.g., 30 seconds).
  3. **Structured Process Arguments**: Never invoke through a shell (`sh -c` or `bash -c`). Arguments are passed directly as a vector of strings (`["pytest", "-q", ...]`).
  4. **Process Tree Termination**: In local fallback mode, processes are executed in a new process group and sent `SIGTERM`/`SIGKILL` on timeout.

### 2.5. Tauri IPC and UI Security
- **Threat**: Cross-site scripting (XSS) or untrusted file paths triggering arbitrary commands via frontend IPC.
- **Mitigation**:
  1. Strict Content Security Policy (CSP): Tauri config disallows external network requests, unsafe inline scripts, and dynamic eval.
  2. Strongly-typed IPC schemas: Frontend communicates via strictly validated commands with path canonicalization.
  3. No raw command execution exposed to IPC: The frontend cannot invoke arbitrary shell commands.

---

## 3. Residual Risks and Documented Boundaries

1. **Local Subprocess Fallback**: When Docker is unavailable on a machine, running tests locally executes the repository's Python environment. GHOSTLIGHT clearly displays a warning prompt requiring explicit user confirmation before proceeding with local test execution.
2. **Static Analysis Imprecision**: Python's dynamic features (e.g. `getattr(mod, var)`, `globals()`, decorators modifying signatures) cannot be fully resolved statically. Unresolved calls are explicitly flagged as `Confidence::Uncertain` and never fabricated as factual edges.
