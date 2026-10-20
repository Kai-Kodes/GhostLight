use ghostlight_analysis::ImpactAnalyzer;
use ghostlight_core::{FileId, NodeId};
use ghostlight_execution::TestRunner;
use ghostlight_graph::build_dependency_graph;
use ghostlight_parser::{extract_python_file, scan_repository, ScanOptions};
use std::path::PathBuf;

#[test]
fn test_regression_fixture_impact_and_execution() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    // Go up to workspace root: crates/ghostlight-analysis -> crates -> workspace root
    let workspace_root = manifest_dir.parent().unwrap().parent().unwrap();
    let fixture_root = workspace_root.join("fixtures").join("regression-python");

    assert!(fixture_root.exists(), "Fixture path must exist: {:?}", fixture_root);

    // 1. Scan fixture repository
    let scanned_files = scan_repository(&fixture_root, &ScanOptions::default()).unwrap();
    assert!(scanned_files.len() >= 4);

    // 2. Parse all files
    let mut parsed_files = Vec::new();
    for sf in &scanned_files {
        let pf = extract_python_file(&sf.file_id, &sf.absolute_path, sf.is_test).unwrap();
        parsed_files.push(pf);
    }

    // 3. Construct dependency graph
    let graph = build_dependency_graph(&parsed_files);
    assert!(graph.node_count() > 0);

    // 4. Analyze impact of `pricing/discount.py::calculate_discount`
    let f_discount = FileId::from_relative_path("pricing/discount.py");
    let analyzer = ImpactAnalyzer::new(&graph);
    let impact = analyzer
        .analyze_symbol_impact(&f_discount, "calculate_discount")
        .expect("calculate_discount symbol must be found in graph");

    // 5. Verify direct and transitive impact
    // CheckoutService::process_order calls calculate_discount
    let checkout_file = FileId::from_relative_path("pricing/checkout.py");
    let checkout_sym = NodeId::for_symbol(&checkout_file, "CheckoutService::process_order");
    assert!(
        impact.affected_nodes.iter().any(|n| n.node_id == checkout_sym),
        "CheckoutService::process_order must be in affected nodes"
    );

    // 6. Verify candidate tests
    let test_disc_file = FileId::from_relative_path("tests/test_discount.py");
    let test_tax_file = FileId::from_relative_path("tests/test_tax.py");

    let test_acc_sym = NodeId::for_symbol(&test_disc_file, "test_calculate_discount_accurate");
    let test_chk_sym = NodeId::for_symbol(&test_disc_file, "test_checkout_process_order");

    assert!(
        impact.candidate_tests.iter().any(|t| t.test_node_id == test_acc_sym),
        "test_calculate_discount_accurate must be selected"
    );
    assert!(
        impact.candidate_tests.iter().any(|t| t.test_node_id == test_chk_sym),
        "test_checkout_process_order must be selected"
    );

    // Ensure unaffected tax test is NOT selected
    let tax_test_sym = NodeId::for_symbol(&test_tax_file, "test_vat_standard");
    assert!(
        !impact.candidate_tests.iter().any(|t| t.test_node_id == tax_test_sym),
        "test_vat_standard must NOT be selected for discount change"
    );

    // 7. Execute authorized candidate tests in real environment
    let runner = TestRunner::new(&fixture_root);
    let run_result = runner
        .execute_tests(&impact.candidate_tests, true, false)
        .expect("Test execution must succeed");

    // 8. Assert that deliberate regression causes test failure
    assert!(!run_result.passed, "Regression fixture must fail execution");
    assert!(
        run_result.stdout.contains("FAILED") || run_result.stdout.contains("assert"),
        "Execution output must explain regression assertion failure"
    );

    // Verify predictions vs observed reconciliation
    assert_eq!(run_result.comparisons.len(), impact.candidate_tests.len());
    for comp in &run_result.comparisons {
        assert!(comp.execution_confirmed);
        assert!(!comp.observed_passed);
    }
}
