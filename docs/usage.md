# GHOSTLIGHT: User Manual & CLI Reference

## 1. Quick Start

### Building from Source
Ensure Rust 1.85+ and Node 22+ (with pnpm) are available on your system:

```bash
git clone https://github.com/ghostlight-org/ghostlight.git
cd ghostlight
cargo build --release
```

The compiled binary will be placed at `target/release/ghostlight`.

---

## 2. Command-Line Interface (CLI)

### System Diagnostics (`doctor`)
Inspect the local environment, Python runtime, pytest availability, and Docker container isolation capabilities:

```bash
ghostlight doctor
```

### Repository Scanning (`scan`)
Scan a Python codebase to inspect files, sizes, and deterministic repository content fingerprints:

```bash
ghostlight scan path/to/repo
ghostlight scan path/to/repo --json
```

### Dependency Graph (`graph`)
Build the semantic multi-graph and export Cytoscape-compatible JSON:

```bash
ghostlight graph path/to/repo
ghostlight graph path/to/repo --output graph.json
```

### Change-Impact Analysis (`impact`)
Calculate direct and transitive downstream impact when modifying a specific file or symbol:

```bash
# Analyze impact of modifying an entire file
ghostlight impact path/to/repo --file src/utils.py

# Analyze impact of modifying a specific function or class
ghostlight impact path/to/repo --file src/utils.py --symbol format_date --json
```

### Targeted Test Verification (`test`)
Identify candidate affected tests without executing any untrusted code:

```bash
ghostlight test path/to/repo --file src/discount.py --symbol calculate_discount
```

To explicitly authorize execution under safe container or restricted sandbox controls:

```bash
# Execute in disposable air-gapped Docker container (default if Docker is running)
ghostlight test path/to/repo --file src/discount.py --symbol calculate_discount --execute

# Or execute in a restricted local subprocess
ghostlight test path/to/repo --file src/discount.py --symbol calculate_discount --execute --local
```

### Executive Intelligence Report (`report`)
Generate an exportable analysis report in Markdown or JSON format:

```bash
ghostlight report path/to/repo --format markdown
ghostlight report path/to/repo --file src/models.py --symbol User --format json --output report.json
```

### Interactive Desktop UI Bridge (`serve`)
Launch the dark-first interactive Cytoscape web desktop interface:

```bash
ghostlight serve --port 1420
```

Open your browser at `http://127.0.0.1:1420`.

---

## 3. Desktop Application Guide

1. **Repository Selection**: Enter a local repository path in the top bar or select one of the pre-bundled test fixtures (`simple-python`, `complex-python`, `regression-python`).
2. **Interactive Dependency Graph**:
   - Pan and zoom freely using mouse drag or floating zoom controls.
   - Click any node to open the **Node Details** panel.
   - Use filter toggles in the top-right to filter out tests, files, or external imports.
3. **Change Impact Calculation**:
   - In Node Details, click **Calculate Change Impact**.
   - Direct downstream dependents highlight with an amber glow; transitive ripples highlight with rose.
   - Click **Explain Path** next to any affected entity to highlight the exact multi-hop causal chain on the graph canvas.
4. **Targeted Test Execution**:
   - Switch to the **Candidate Tests** tab.
   - Review selected candidate tests and their selection reasons (`DirectCall`, `TransitiveCall`).
   - Check **"I explicitly authorize executing these candidate tests"**.
   - Click **Run Authorized Tests** to execute in the sandbox and view real stdout/stderr output and failure reconciliation.
5. **Report Export**:
   - Click **Report** in the top bar to inspect or download the versioned Markdown/JSON intelligence report.
