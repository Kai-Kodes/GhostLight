use ghostlight_analysis::{ImpactAnalyzer, TestCandidate};
use ghostlight_core::{FileId, RepositoryFingerprint};
use ghostlight_execution::TestRunner;
use ghostlight_graph::build_dependency_graph;
use ghostlight_parser::{extract_python_file, scan_repository, ScanOptions};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};

#[derive(Deserialize)]
struct PathReq {
    path: String,
}

#[derive(Deserialize)]
struct ImpactReq {
    path: String,
    file: Option<String>,
    symbol: Option<String>,
}

#[derive(Deserialize)]
struct TestReq {
    path: String,
    candidates: Vec<TestCandidate>,
    authorized: bool,
    docker: bool,
}

pub fn start_server(dist_dir: PathBuf, _default_repo: Option<PathBuf>, port: u16) {
    let addr = format!("127.0.0.1:{}", port);
    let listener = TcpListener::bind(&addr).expect("Failed to bind TCP server port");

    println!("============================================================");
    println!("  GHOSTLIGHT Desktop Interface Bridge Running");
    println!("  Access URL: http://{}", addr);
    println!("  Serving UI from: {:?}", dist_dir);
    println!("============================================================");

    for stream in listener.incoming() {
        if let Ok(mut stream) = stream {
            let dist_dir_clone = dist_dir.clone();
            let _ = handle_connection(&mut stream, &dist_dir_clone);
        }
    }
}

fn handle_connection(stream: &mut TcpStream, dist_dir: &Path) -> std::io::Result<()> {
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut line = String::new();
    reader.read_line(&mut line)?;

    let mut parts = line.split_whitespace();
    let method = parts.next().unwrap_or("GET").to_string();
    let uri = parts.next().unwrap_or("/").to_string();

    let mut content_length = 0;
    loop {
        line.clear();
        if reader.read_line(&mut line)? == 0 || line == "\r\n" || line == "\n" {
            break;
        }
        let lower = line.to_lowercase();
        if lower.starts_with("content-length:") {
            if let Some(val) = lower.split(':').nth(1) {
                content_length = val.trim().parse().unwrap_or(0);
            }
        }
    }

    let mut body = vec![0u8; content_length];
    if content_length > 0 {
        reader.read_exact(&mut body)?;
    }

    match (method.as_str(), uri.as_str()) {
        ("POST", "/api/scan") => {
            if let Ok(req) = serde_json::from_slice::<PathReq>(&body) {
                let repo_path = Path::new(&req.path);
                if let Ok(files) = scan_repository(repo_path, &ScanOptions::default()) {
                    let mut file_hashes = BTreeMap::new();
                    for f in &files {
                        file_hashes.insert(f.file_id.as_str().to_string(), f.content_hash.clone());
                    }
                    let fp = RepositoryFingerprint::compute(file_hashes);
                    let resp = serde_json::json!({
                        "repository": req.path,
                        "fingerprint": fp.root_hash,
                        "file_count": fp.file_count,
                        "files": files.iter().map(|f| {
                            serde_json::json!({
                                "path": f.file_id.as_str(),
                                "size_bytes": f.size_bytes,
                                "hash": f.content_hash.as_str(),
                                "is_test": f.is_test,
                            })
                        }).collect::<Vec<_>>()
                    });
                    return send_json(stream, 200, &resp);
                }
            }
            send_json(stream, 400, &serde_json::json!({ "error": "Invalid scan request" }))
        }

        ("POST", "/api/graph") => {
            if let Ok(req) = serde_json::from_slice::<PathReq>(&body) {
                let repo_path = Path::new(&req.path);
                if let Ok(files) = scan_repository(repo_path, &ScanOptions::default()) {
                    let mut parsed = Vec::new();
                    for f in files {
                        if let Ok(pf) = extract_python_file(&f.file_id, &f.absolute_path, f.is_test) {
                            parsed.push(pf);
                        }
                    }
                    let graph = build_dependency_graph(&parsed);
                    let export = graph.export_dto();
                    return send_json(stream, 200, &export);
                }
            }
            send_json(stream, 400, &serde_json::json!({ "error": "Invalid graph request" }))
        }

        ("POST", "/api/impact") => {
            if let Ok(req) = serde_json::from_slice::<ImpactReq>(&body) {
                let repo_path = Path::new(&req.path);
                if let Ok(files) = scan_repository(repo_path, &ScanOptions::default()) {
                    let mut parsed = Vec::new();
                    for f in files {
                        if let Ok(pf) = extract_python_file(&f.file_id, &f.absolute_path, f.is_test) {
                            parsed.push(pf);
                        }
                    }
                    let graph = build_dependency_graph(&parsed);
                    let analyzer = ImpactAnalyzer::new(&graph);

                    let report = if let Some(sym) = req.symbol {
                        let f_id = match req.file {
                            Some(f) => FileId::from_relative_path(f),
                            None => return send_json(stream, 400, &serde_json::json!({ "error": "Symbol requires file" })),
                        };
                        analyzer.analyze_symbol_impact(&f_id, &sym)
                    } else if let Some(f) = req.file {
                        let f_id = FileId::from_relative_path(f);
                        analyzer.analyze_file_impact(&f_id)
                    } else {
                        None
                    };

                    if let Some(r) = report {
                        return send_json(stream, 200, &r);
                    }
                }
            }
            send_json(stream, 400, &serde_json::json!({ "error": "Target node not found" }))
        }

        ("POST", "/api/test") => {
            if let Ok(req) = serde_json::from_slice::<TestReq>(&body) {
                let runner = TestRunner::new(&req.path);
                match runner.execute_tests(&req.candidates, req.authorized, req.docker) {
                    Ok(res) => return send_json(stream, 200, &res),
                    Err(e) => return send_json(stream, 500, &serde_json::json!({ "error": e.to_string() })),
                }
            }
            send_json(stream, 400, &serde_json::json!({ "error": "Invalid test request" }))
        }

        ("GET", "/api/doctor") => {
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

            let doc = serde_json::json!({
                "rust_version": "stable Rust 1.85.1",
                "python_version": py_ver,
                "pytest_version": pytest_ver,
                "docker_available": docker_ok,
                "security_status": "ENFORCED (No arbitrary execution without authorization)",
            });
            send_json(stream, 200, &doc)
        }

        ("GET", path) => {
            // Serve static files from apps/desktop/dist
            let clean_path = if path == "/" {
                "index.html"
            } else {
                path.trim_start_matches('/')
            };

            let file_path = dist_dir.join(clean_path);
            let target_path = if file_path.exists() && file_path.is_file() {
                file_path
            } else {
                dist_dir.join("index.html")
            };

            if let Ok(content) = std::fs::read(&target_path) {
                let mime = if target_path.extension().and_then(|s| s.to_str()) == Some("js") {
                    "application/javascript"
                } else if target_path.extension().and_then(|s| s.to_str()) == Some("css") {
                    "text/css"
                } else if target_path.extension().and_then(|s| s.to_str()) == Some("html") {
                    "text/html"
                } else {
                    "application/octet-stream"
                };

                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    mime,
                    content.len()
                );
                stream.write_all(response.as_bytes())?;
                stream.write_all(&content)?;
                stream.flush()?;
                return Ok(());
            }

            let not_found = "HTTP/1.1 404 NOT FOUND\r\nContent-Length: 9\r\nConnection: close\r\n\r\nNot Found";
            stream.write_all(not_found.as_bytes())?;
            stream.flush()?;
            Ok(())
        }

        _ => {
            let res = "HTTP/1.1 405 METHOD NOT ALLOWED\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
            stream.write_all(res.as_bytes())?;
            stream.flush()?;
            Ok(())
        }
    }
}

fn send_json<T: Serialize>(stream: &mut TcpStream, status: u16, data: &T) -> std::io::Result<()> {
    let json = serde_json::to_string(data)?;
    let response = format!(
        "HTTP/1.1 {} OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status,
        json.len(),
        json
    );
    stream.write_all(response.as_bytes())?;
    stream.flush()?;
    Ok(())
}
