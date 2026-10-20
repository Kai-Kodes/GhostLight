use criterion::{black_box, criterion_group, criterion_main, Criterion, Throughput};
use ghostlight_analysis::{AnalysisReport, ImpactAnalyzer, IncrementalEngine, RepositoryDelta};
use ghostlight_core::{ContentHash, FileId, RepositoryFingerprint};
use ghostlight_graph::build_dependency_graph;
use ghostlight_parser::extract_python_source;
use std::collections::BTreeMap;
use std::fs;
use tempfile::tempdir;

const SAMPLE_PYTHON_MODULE: &str = r#"
import os
import sys
from math import sqrt, ceil
from typing import List, Optional, Dict

class BaseEntity:
    def __init__(self, uid: str):
        self.uid = uid

    def to_dict(self) -> Dict[str, str]:
        return {"uid": self.uid}

class User(BaseEntity):
    def __init__(self, uid: str, name: str, email: str):
        super().__init__(uid)
        self.name = name
        self.email = email

    def format_display(self) -> str:
        return f"{self.name} <{self.email}>"

class OrderProcessor:
    def __init__(self, factor: float):
        self.factor = factor

    def calculate_price(self, base: float, discount: float) -> float:
        d = self.compute_discount(base, discount)
        return max(0.0, base - d)

    def compute_discount(self, base: float, pct: float) -> float:
        return base * (pct / 100.0)

def calculate_stats(values: List[float]) -> Dict[str, float]:
    total = sum(values)
    avg = total / len(values) if values else 0.0
    return {"total": total, "avg": avg}

def test_user_creation():
    u = User("1", "Alice", "alice@example.com")
    assert u.uid == "1"

def test_order_calc():
    op = OrderProcessor(1.0)
    assert op.calculate_price(100.0, 10.0) == 90.0
"#;

fn bench_parsing_throughput(c: &mut Criterion) {
    let mut group = c.benchmark_group("parsing_throughput");
    let file_id = FileId::from_relative_path("src/module.py");
    let bytes_len = SAMPLE_PYTHON_MODULE.len() as u64;

    group.throughput(Throughput::Bytes(bytes_len));
    group.bench_function("tree_sitter_python_extract", |b| {
        b.iter(|| {
            let res = extract_python_source(
                black_box(&file_id),
                black_box(SAMPLE_PYTHON_MODULE),
                black_box(false),
            );
            assert!(res.is_ok());
        })
    });
    group.finish();
}

fn bench_graph_and_impact(c: &mut Criterion) {
    let mut group = c.benchmark_group("graph_and_impact");

    // Generate 50 synthetic connected modules
    let mut parsed_files = Vec::new();
    for i in 0..50 {
        let code = format!(
            r#"
from .mod_{} import func_{}

def func_{}(x):
    return func_{}(x) + 1

class Service_{}:
    def run(self):
        return func_{}(10)

def test_service_{}():
    s = Service_{}()
    assert s.run() > 0
"#,
            (i + 1) % 50,
            (i + 1) % 50,
            i,
            (i + 1) % 50,
            i,
            i,
            i,
            i
        );
        let fid = FileId::from_relative_path(format!("pkg/mod_{}.py", i));
        let pf = extract_python_source(&fid, &code, false).unwrap();
        parsed_files.push(pf);
    }

    group.bench_function("build_graph_50_modules", |b| {
        b.iter(|| {
            let graph = build_dependency_graph(black_box(&parsed_files));
            assert!(graph.node_count() > 0);
        })
    });

    let graph = build_dependency_graph(&parsed_files);
    let target_file = FileId::from_relative_path("pkg/mod_0.py");
    let analyzer = ImpactAnalyzer::new(&graph);

    group.bench_function("impact_query_50_modules", |b| {
        b.iter(|| {
            let impact = analyzer.analyze_symbol_impact(black_box(&target_file), black_box("func_0"));
            assert!(impact.is_some());
        })
    });

    group.finish();
}

fn bench_differential_vs_cold(c: &mut Criterion) {
    let mut group = c.benchmark_group("differential_analysis");

    // Create 30 files in a temp directory
    let dir = tempdir().unwrap();
    let mut base_map = BTreeMap::new();
    let mut parsed_files = Vec::new();

    for i in 0..30 {
        let name = format!("file_{}.py", i);
        let path = dir.path().join(&name);
        let content = format!("def compute_{}(x):\n    return x * {}\n", i, i);
        fs::write(&path, &content).unwrap();

        let fid = FileId::from_relative_path(&name);
        base_map.insert(name.clone(), ContentHash::from_bytes(content.as_bytes()));
        let pf = extract_python_source(&fid, &content, false).unwrap();
        parsed_files.push(pf);
    }

    let fp_baseline = RepositoryFingerprint::compute(base_map.clone());
    let mut engine = IncrementalEngine::new();
    let _ = engine.initial_scan(parsed_files, fp_baseline.clone());

    // Modify only 1 file
    let mut mod_map = base_map.clone();
    mod_map.insert(
        "file_15.py".to_string(),
        ContentHash::from_bytes(b"def compute_15(x):\n    return x * 999\n"),
    );
    let fp_modified = RepositoryFingerprint::compute(mod_map);
    let delta = RepositoryDelta::compute(&fp_baseline, &fp_modified);

    group.bench_function("incremental_update_single_file", |b| {
        b.iter(|| {
            let mut eng = engine.clone();
            let g = eng.apply_incremental_changes(
                black_box(dir.path()),
                black_box(&delta),
                black_box(fp_modified.clone()),
            );
            assert!(g.node_count() > 0);
        })
    });

    group.finish();
}

fn bench_report_generation(c: &mut Criterion) {
    let mut group = c.benchmark_group("report_generation");

    let f_main = FileId::from_relative_path("main.py");
    let p_main = extract_python_source(&f_main, SAMPLE_PYTHON_MODULE, false).unwrap();
    let graph = build_dependency_graph(&[p_main]);
    let analyzer = ImpactAnalyzer::new(&graph);
    let impact = analyzer.analyze_symbol_impact(&f_main, "calculate_stats");

    let mut map = BTreeMap::new();
    map.insert("main.py".to_string(), ContentHash::from_bytes(SAMPLE_PYTHON_MODULE.as_bytes()));
    let fp = RepositoryFingerprint::compute(map);

    let report = AnalysisReport::new(
        "/workspace".to_string(),
        fp,
        &graph,
        impact,
        vec![],
    );

    group.bench_function("serialize_report_json", |b| {
        b.iter(|| {
            let json = black_box(&report).to_json().unwrap();
            assert!(!json.is_empty());
        })
    });

    group.bench_function("render_report_markdown", |b| {
        b.iter(|| {
            let md = black_box(&report).to_markdown();
            assert!(!md.is_empty());
        })
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_parsing_throughput,
    bench_graph_and_impact,
    bench_differential_vs_cold,
    bench_report_generation
);
criterion_main!(benches);
