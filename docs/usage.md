# GHOSTLIGHT: User Manual & CLI Reference

## 1. Quick Start

### Building from Source
Ensure Rust 1.85+ and Node 22+ (with pnpm) are available on your system:

```bash
git clone https://github.com/Kai-Kodes/GhostLight.git
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

1. **Activity Rail & Navigation**:
   - Use the far-left Activity Rail to toggle between primary developer workflows:
     - **Codebase Explorer**: Search symbols, classes, functions, and files with instant filtering and tree/flat grouping.
     - **Blast Radius**: Comprehensive change-impact breakdown with direct vs. transitive filters and interactive step-by-step causal chain expansion.
     - **Codebase Insights**: Structural metrics, including top hub symbols (highest incoming dependents), coupling fan-out, circular dependency cycle detection, and external dependencies.
     - **Doctor Diagnostics & Report Export**: Instant toolchain verification and one-click Markdown/JSON export.
2. **Interactive Dependency Graph**:
   - High-fidelity dark developer canvas powered by Cytoscape and Dagre layout.
   - Distinct geometric treatments: Rectangular cards for files/modules, rounded capsules for classes, cards for functions/methods, and diamond badges for test suites.
   - Distinct edge types: Solid cyan for function calls, dashed slate for imports, solid violet for inheritance.
   - Floating viewport controls: Zoom, Fit (`Space` / `F`), layout recalculation, and visibility filters (show/hide tests, files, externals).
   - Interactive Legend overlay explaining all shapes and colors.
3. **Change Impact & Causal Path Illumination**:
   - Select any symbol, method, or file and click **Calculate Blast Radius**.
   - Target entity illuminates in Electric Cyan; direct dependents highlight in Amber; transitive ripples highlight in Crimson.
   - Unrelated background nodes and edges are gracefully dimmed (`opacity: 0.15`) for maximum signal-to-noise ratio.
   - Expand any affected entity to view its exact propagation hops, and click **Illuminate Graph** to trace the causal chain with glowing cyan edges.
4. **Targeted Test Execution & Sandbox**:
   - Switch to the **Candidate Tests** tab.
   - Review selected candidate tests and their selection reasons (`DirectCall`, `TransitiveCall`, `DirectImport`, `NamingConvention`).
   - Toggle sandbox strategy: Air-Gapped Docker container (network disabled, read-only rootfs) vs. Restricted Subprocess.
   - Check authorization checkbox and click **Execute Candidate Tests**.
   - Review evidence table comparing static predictions against observed outcomes, and inspect raw output in the terminal log viewer.
5. **High-Density Status Bar**:
   - Instant visibility into active repository path, content fingerprint (SHA-256), node/edge counts, detected dependency cycles, and sandbox isolation capability.
   - Keyboard shortcuts: `Space` (fit graph), `Esc` (clear selection), `Ctrl+E` (export report), `Ctrl+D` (doctor diagnostics).
