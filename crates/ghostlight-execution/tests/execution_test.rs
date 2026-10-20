use ghostlight_analysis::{SelectionReason, TestCandidate};
use ghostlight_core::{Confidence, FileId, NodeId};
use ghostlight_execution::{ExecutionError, TestRunner};
use std::fs;
use tempfile::tempdir;

#[test]
fn test_unauthorized_execution_blocked() {
    let dir = tempdir().unwrap();
    let runner = TestRunner::new(dir.path());
    let candidate = TestCandidate {
        test_node_id: NodeId::for_file(&FileId::from_relative_path("test_dummy.py")),
        file_id: FileId::from_relative_path("test_dummy.py"),
        symbol_name: "test_dummy".to_string(),
        reason: SelectionReason::DirectImport,
        confidence: Confidence::Static,
        explanatory_path: None,
    };

    let err = runner
        .execute_tests(&[candidate], false, false)
        .unwrap_err();
    match err {
        ExecutionError::Unauthorized => (),
        other => panic!("Expected Unauthorized error, got: {:?}", other),
    }
}

#[test]
fn test_invalid_path_blocked() {
    let dir = tempdir().unwrap();
    let runner = TestRunner::new(dir.path());
    let evil_candidate = TestCandidate {
        test_node_id: NodeId::for_file(&FileId::from_relative_path("../../../evil.py")),
        file_id: FileId::from_relative_path("../../../evil.py"),
        symbol_name: "test_evil".to_string(),
        reason: SelectionReason::DirectImport,
        confidence: Confidence::Static,
        explanatory_path: None,
    };

    let err = runner
        .execute_tests(&[evil_candidate], true, false)
        .unwrap_err();
    match err {
        ExecutionError::InvalidTargetPath(_) => (),
        other => panic!("Expected InvalidTargetPath error, got: {:?}", other),
    }
}

#[test]
fn test_real_subprocess_execution() {
    let dir = tempdir().unwrap();
    let test_file = dir.path().join("test_sample.py");
    fs::write(
        &test_file,
        r#"
def test_addition():
    assert 1 + 1 == 2

def test_failure():
    assert 1 == 2
"#,
    )
    .unwrap();

    let runner = TestRunner::new(dir.path());
    let candidate = TestCandidate {
        test_node_id: NodeId::for_symbol(
            &FileId::from_relative_path("test_sample.py"),
            "test_addition",
        ),
        file_id: FileId::from_relative_path("test_sample.py"),
        symbol_name: "test_addition".to_string(),
        reason: SelectionReason::DirectCall,
        confidence: Confidence::Static,
        explanatory_path: None,
    };

    let res = runner.execute_tests(&[candidate], true, false).unwrap();
    assert!(!res.timed_out);
    // Because test_sample.py has one failing test, pytest exits with non-zero
    assert!(!res.passed);
    assert!(res.stdout.contains("FAILED") || res.stdout.contains("test_sample.py"));
    assert_eq!(res.comparisons.len(), 1);
}
