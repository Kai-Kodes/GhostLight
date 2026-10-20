// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ghostlight_analysis::{ImpactAnalyzer, ImpactReport, TestCandidate};
use ghostlight_core::{FileId, RepositoryFingerprint};
use ghostlight_execution::{TestRunResult, TestRunner};
use ghostlight_graph::{build_dependency_graph, GraphExportDto};
use ghostlight_parser::{extract_python_file, scan_repository, ScanOptions};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;

#[derive(Serialize, Deserialize)]
pub struct ScanResultDto {
    pub repository: String,
    pub fingerprint: String,
    pub file_count: usize,
    pub files: Vec<ScannedFileDto>,
}

#[derive(Serialize, Deserialize)]
pub struct ScannedFileDto {
    pub path: String,
    pub size_bytes: u64,
    pub hash: String,
    pub is_test: bool,
}

#[derive(Serialize, Deserialize)]
pub struct DoctorDto {
    pub rust_version: String,
    pub python_version: String,
    pub pytest_version: String,
    pub docker_available: bool,
    pub security_status: String,
}

#[tauri::command]
fn scan_repo(path: String) -> Result<ScanResultDto, String> {
    let repo_path = Path::new(&path);
    let files = scan_repository(repo_path, &ScanOptions::default())
        .map_err(|e| format!("Scan error: {}", e))?;

    let mut file_hashes = BTreeMap::new();
    let mut files_dto = Vec::new();

    for f in &files {
        file_hashes.insert(f.file_id.as_str().to_string(), f.content_hash.clone());
        files_dto.push(ScannedFileDto {
            path: f.file_id.as_str().to_string(),
            size_bytes: f.size_bytes,
            hash: f.content_hash.as_str().to_string(),
            is_test: f.is_test,
        });
    }

    let fp = RepositoryFingerprint::compute(file_hashes);

    Ok(ScanResultDto {
        repository: path,
        fingerprint: fp.root_hash,
        file_count: files_dto.len(),
        files: files_dto,
    })
}

#[tauri::command]
fn get_graph(path: String) -> Result<GraphExportDto, String> {
    let repo_path = Path::new(&path);
    let files = scan_repository(repo_path, &ScanOptions::default())
        .map_err(|e| format!("Scan error: {}", e))?;

    let mut parsed_files = Vec::new();
    for f in files {
        if let Ok(pf) = extract_python_file(&f.file_id, &f.absolute_path, f.is_test) {
            parsed_files.push(pf);
        }
    }

    let graph = build_dependency_graph(&parsed_files);
    Ok(graph.export_dto())
}

#[tauri::command]
fn analyze_impact(
    path: String,
    file: Option<String>,
    symbol: Option<String>,
) -> Result<ImpactReport, String> {
    let repo_path = Path::new(&path);
    let files = scan_repository(repo_path, &ScanOptions::default())
        .map_err(|e| format!("Scan error: {}", e))?;

    let mut parsed_files = Vec::new();
    for f in files {
        if let Ok(pf) = extract_python_file(&f.file_id, &f.absolute_path, f.is_test) {
            parsed_files.push(pf);
        }
    }

    let graph = build_dependency_graph(&parsed_files);
    let analyzer = ImpactAnalyzer::new(&graph);

    let report = if let Some(sym) = symbol {
        let f_id = match file {
            Some(f) => FileId::from_relative_path(f),
            None => return Err("Symbol requires file".to_string()),
        };
        analyzer.analyze_symbol_impact(&f_id, &sym)
    } else if let Some(f) = file {
        let f_id = FileId::from_relative_path(f);
        analyzer.analyze_file_impact(&f_id)
    } else {
        return Err("Must provide file or symbol".to_string());
    };

    report.ok_or_else(|| "Target node not found".to_string())
}

#[tauri::command]
fn run_candidate_tests(
    path: String,
    candidates: Vec<TestCandidate>,
    authorized: bool,
    docker: bool,
) -> Result<TestRunResult, String> {
    let runner = TestRunner::new(&path);
    runner
        .execute_tests(&candidates, authorized, docker)
        .map_err(|e| format!("Execution error: {}", e))
}

#[tauri::command]
fn check_doctor() -> DoctorDto {
    let py_ver = std::process::Command::new("python3")
        .arg("--version")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "NOT FOUND".to_string());

    let pytest_ver = std::process::Command::new("python3")
        .args(["-m", "pytest", "--version"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "NOT INSTALLED".to_string());

    let docker_ok = ghostlight_execution::docker::check_docker_available();

    DoctorDto {
        rust_version: "stable Rust 1.85.1".to_string(),
        python_version: py_ver,
        pytest_version: pytest_ver,
        docker_available: docker_ok,
        security_status: "ENFORCED (No arbitrary execution without authorization)".to_string(),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_repo,
            get_graph,
            analyze_impact,
            run_candidate_tests,
            check_doctor
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
