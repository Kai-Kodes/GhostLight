use std::process::Command;

#[test]
fn test_cli_scan_json() {
    let binary = env!("CARGO_BIN_EXE_ghostlight");
    let output = Command::new(binary)
        .args(["scan", "fixtures/simple-python", "--json"])
        .current_dir(env!("CARGO_MANIFEST_DIR").to_string() + "/../..")
        .output()
        .expect("Failed to run CLI");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(&stdout).expect("Valid JSON");
    assert_eq!(parsed["file_count"], 3);
}

#[test]
fn test_cli_doctor() {
    let binary = env!("CARGO_BIN_EXE_ghostlight");
    let output = Command::new(binary)
        .arg("doctor")
        .output()
        .expect("Failed to run doctor");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("Rust Toolchain:       OK"));
    assert!(stdout.contains("Python AST Parser:    OK"));
}

#[test]
fn test_cli_impact_analysis() {
    let binary = env!("CARGO_BIN_EXE_ghostlight");
    let output = Command::new(binary)
        .args([
            "impact",
            "fixtures/simple-python",
            "--file",
            "math_ops.py",
            "--symbol",
            "add",
            "--json",
        ])
        .current_dir(env!("CARGO_MANIFEST_DIR").to_string() + "/../..")
        .output()
        .expect("Failed to run impact");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(&stdout).expect("Valid JSON");
    assert_eq!(parsed["target_name"], "add");
    assert!(parsed["direct_count"].as_u64().unwrap() >= 1);
}
