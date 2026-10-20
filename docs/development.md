# GHOSTLIGHT: Contributor & Development Guide

## 1. Workspace Organization

```
ghostlight/
├── crates/
│   ├── ghostlight-core/       # Domain types, deterministic IDs, SHA-256 fingerprints
│   ├── ghostlight-parser/     # Tree-sitter AST extraction, safe repository scanner
│   ├── ghostlight-graph/      # Petgraph multi-graph, semantic resolution, pathfinding
│   ├── ghostlight-analysis/   # Change-impact engine, test selection, differential engine
│   ├── ghostlight-execution/  # Docker & subprocess safe test runners
│   └── ghostlight-cli/        # CLI commands, report formats, and local web bridge
├── apps/
│   └── desktop/               # React 18 + TypeScript + Tailwind + Cytoscape desktop UI
├── fixtures/                  # Modular test fixtures (simple, complex, cycle, regression)
├── benches/                   # Criterion reproducible performance benchmarks
└── docs/                      # Architectural decisions, threat model, and manuals
```

---

## 2. Running Automated Tests

Run the full Rust automated test suite:

```bash
cargo test --workspace
```

Run frontend test suite:

```bash
cd apps/desktop
pnpm test
```

Build the release binary:

```bash
cargo build --release
```

Run performance benchmarks:

```bash
cargo bench
```

---

## 3. Adding New Language Grammars

The analysis engine is decoupled from language-specific syntax:
1. Implement a new extractor in `crates/ghostlight-parser` (e.g. `javascript`, `go`, `rust`).
2. Map AST definitions to standard `ClassDef`, `FunctionDef`, `ImportStatement`, and `CallExpression`.
3. Feed the parsed files into `ghostlight_graph::build_dependency_graph`.
All graph queries, impact calculations, explanatory path algorithms, and UI visualizations work seamlessly across languages.
