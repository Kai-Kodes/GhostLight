use ghostlight_core::{ContentHash, FileId, NodeId, RepositoryFingerprint};
use ghostlight_analysis::{
    AnalysisReport, ImpactAnalyzer, ImpactType, RepositoryDelta,
};
use ghostlight_graph::build_dependency_graph;
use ghostlight_parser::extract_python_source;
use std::collections::BTreeMap;

#[test]
fn test_impact_analysis_and_test_selection() {
    let math_code = r#"
def add(a, b):
    return a + b
"#;
    let calc_code = r#"
from .math import add

def compute_total(items):
    total = 0
    for x in items:
        total = add(total, x)
    return total
"#;
    let invoice_code = r#"
from .calc import compute_total

def generate_invoice(items):
    total = compute_total(items)
    return {"total": total}
"#;
    let test_calc = r#"
from .calc import compute_total

def test_compute_total():
    assert compute_total([1, 2, 3]) == 6
"#;
    let test_invoice = r#"
from .invoice import generate_invoice

def test_generate_invoice():
    res = generate_invoice([10, 20])
    assert res["total"] == 30
"#;

    let f_math = FileId::from_relative_path("pkg/math.py");
    let f_calc = FileId::from_relative_path("pkg/calc.py");
    let f_inv = FileId::from_relative_path("pkg/invoice.py");
    let f_t_calc = FileId::from_relative_path("tests/test_calc.py");
    let f_t_inv = FileId::from_relative_path("tests/test_invoice.py");

    let p_math = extract_python_source(&f_math, math_code, false).unwrap();
    let p_calc = extract_python_source(&f_calc, calc_code, false).unwrap();
    let p_inv = extract_python_source(&f_inv, invoice_code, false).unwrap();
    let p_t_calc = extract_python_source(&f_t_calc, test_calc, true).unwrap();
    let p_t_inv = extract_python_source(&f_t_inv, test_invoice, true).unwrap();

    let graph = build_dependency_graph(&[p_math, p_calc, p_inv, p_t_calc, p_t_inv]);
    let analyzer = ImpactAnalyzer::new(&graph);

    // Analyze impact of modifying `math.py::add`
    let report = analyzer
        .analyze_symbol_impact(&f_math, "add")
        .expect("Should find add symbol");

    assert_eq!(report.target_name, "add");
    // Direct dependent: compute_total
    let calc_sym = NodeId::for_symbol(&f_calc, "compute_total");
    assert!(report.affected_nodes.iter().any(|n| n.node_id == calc_sym && n.impact_type == ImpactType::Direct));

    // Transitive dependent: generate_invoice
    let inv_sym = NodeId::for_symbol(&f_inv, "generate_invoice");
    assert!(report.affected_nodes.iter().any(|n| n.node_id == inv_sym && n.impact_type == ImpactType::Transitive));

    // Candidate tests should include both test_compute_total and test_generate_invoice!
    let t_calc_sym = NodeId::for_symbol(&f_t_calc, "test_compute_total");
    let t_inv_sym = NodeId::for_symbol(&f_t_inv, "test_generate_invoice");
    assert!(report.candidate_tests.iter().any(|t| t.test_node_id == t_calc_sym));
    assert!(report.candidate_tests.iter().any(|t| t.test_node_id == t_inv_sym));

    // Generate AnalysisReport
    let mut file_hashes = BTreeMap::new();
    file_hashes.insert("pkg/math.py".to_string(), ContentHash::from_bytes(math_code.as_bytes()));
    let fp = RepositoryFingerprint::compute(file_hashes);

    let full_report = AnalysisReport::new(
        "/workspace".to_string(),
        fp,
        &graph,
        Some(report),
        vec![],
    );

    let json = full_report.to_json().expect("Export json");
    assert!(json.contains("\"schema_version\": \"1.0.0\""));
    let md = full_report.to_markdown();
    assert!(md.contains("# GHOSTLIGHT Codebase Intelligence & Impact Report"));
    assert!(md.contains("Modified Target"));
}

#[test]
fn test_repository_delta_computation() {
    let mut map1 = BTreeMap::new();
    map1.insert("a.py".to_string(), ContentHash::new("hash1"));
    map1.insert("b.py".to_string(), ContentHash::new("hash2"));
    let fp1 = RepositoryFingerprint::compute(map1);

    let mut map2 = BTreeMap::new();
    map2.insert("a.py".to_string(), ContentHash::new("hash1")); // unchanged
    map2.insert("b.py".to_string(), ContentHash::new("hash2_modified")); // modified
    map2.insert("c.py".to_string(), ContentHash::new("hash3")); // added
    let fp2 = RepositoryFingerprint::compute(map2);

    let delta = RepositoryDelta::compute(&fp1, &fp2);
    assert_eq!(delta.unchanged, vec![FileId::from_relative_path("a.py")]);
    assert_eq!(delta.modified, vec![FileId::from_relative_path("b.py")]);
    assert_eq!(delta.added, vec![FileId::from_relative_path("c.py")]);
    assert!(delta.deleted.is_empty());
}
