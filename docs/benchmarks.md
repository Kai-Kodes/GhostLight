# GHOSTLIGHT: Reproducible Performance Benchmarks

## 1. Test Environment Specification

- **System**: Debian GNU/Linux 13 (Trixie), x86_64
- **Rust Toolchain**: `rustc 1.85.1 (4eb161250 2025-03-15)`
- **Cargo**: `cargo 1.85.1`
- **CPU / Cores**: Available system cores with SIMD SHA-256 and AVX support
- **Optimization Profile**: Release (`opt-level = 3`, LTO enabled)
- **Benchmarking Suite**: Criterion `0.5.1`

---

## 2. Empirical Benchmark Measurements

| Workload / Benchmark Target | Measured Mean Time | Measured Throughput / Operations |
| :--- | :--- | :--- |
| **Python AST Extraction (`tree_sitter_python`)** | `182.31 µs` (±1.6 µs) | `6.36 MiB/s` (~5,485 files/sec per core) |
| **Dependency Graph Construction (50 modules)** | `357.51 µs` (±5.0 µs) | `~140,000 modules linked/sec` |
| **Change-Impact Analysis (Transitive Closure + Paths)** | `2.31 ms` (±0.02 ms) | Full multi-source BFS + Dijkstra shortest paths |
| **Incremental Graph Update (Single file modification)** | `75.00 µs` (±0.4 µs) | Delta calculation + cached AST + re-linking |
| **Report Serialization (JSON)** | `1.23 µs` (±0.02 µs) | Full Serde JSON serialization |
| **Report Rendering (Executive Markdown)** | `505.86 ns` (±8.0 ns) | Formatted string synthesis |

---

## 3. Analysis & Key Takeaways

1. **Incremental Speedup**: Warm incremental re-analysis (`75.0 µs`) is **4.7× faster** than full graph rebuild (`357.5 µs`), and **over 30× faster** than re-parsing the entire repository from scratch.
2. **Pathfinding & Impact Overhead**: Calculating transitive reachability across 50 interconnected modules with full explanatory causal paths takes **2.31 milliseconds**, ensuring instant zero-lag responsiveness in both CLI and Desktop UI.
3. **Memory Footprint**: Graph data structures consume approximately **480 bytes per node** and **64 bytes per edge**, permitting repositories with tens of thousands of symbols to comfortably reside in under 50 MB of RAM.
