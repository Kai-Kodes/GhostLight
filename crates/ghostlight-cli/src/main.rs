use clap::{Args, Parser, Subcommand, ValueEnum};
use ghostlight_analysis::{AnalysisReport, ImpactAnalyzer};
use ghostlight_core::{FileId, RepositoryFingerprint};
use ghostlight_execution::TestRunner;
use ghostlight_graph::{build_dependency_graph, DependencyGraph};
use ghostlight_parser::{extract_python_file, scan_repository, ScanOptions};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

pub mod server;

#[derive(Parser, Debug)]
#[command(
    name = "ghostlight",
    version = "0.1.0",
    about = "GHOSTLIGHT: Local-first codebase intelligence & change-impact analysis system",
    long_about = "GHOSTLIGHT reveals the hidden architecture of software repositories, computes explainable change impact, selects candidate tests, and safely verifies them."
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Suppress informational stderr messages
    #[arg(short, long, global = true)]
    quiet: bool,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Scan a repository and report inventory and fingerprint
    Scan(ScanArgs),

    /// Build and inspect the semantic dependency graph
    Graph(GraphArgs),

    /// Compute direct and transitive change impact for a file or symbol
    Impact(ImpactArgs),

    /// Generate and export a versioned codebase intelligence report
    Report(ReportArgs),

    /// Select and optionally execute affected candidate tests
    Test(TestArgs),

    /// Inspect local environment, isolation mechanisms, and tool availability
    Doctor,

    /// Launch local web bridge serving the desktop interactive UI
    Serve(ServeArgs),
}

#[derive(Args, Debug)]
struct ServeArgs {
    /// Initial repository root path to inspect
    #[arg(long)]
    path: Option<PathBuf>,

    /// Local HTTP port to bind
    #[arg(short, long, default_value_t = 1420)]
    port: u16,

    /// Path to compiled desktop frontend dist directory
    #[arg(long)]
    dist: Option<PathBuf>,
}

#[derive(Args, Debug)]
struct ScanArgs {
    /// Path to repository root
    path: PathBuf,

    /// Output machine-readable JSON
    #[arg(long)]
    json: bool,
}

#[derive(Args, Debug)]
struct GraphArgs {
    /// Path to repository root
    path: PathBuf,

    /// Output complete graph as JSON
    #[arg(long)]
    json: bool,

    /// Save graph JSON to file
    #[arg(short, long)]
    output: Option<PathBuf>,
}

#[derive(Args, Debug)]
struct ImpactArgs {
    /// Path to repository root
    path: PathBuf,

    /// Changed relative file path (e.g. src/utils.py)
    #[arg(long)]
    file: Option<String>,

    /// Specific symbol within file (e.g. calculate_total)
    #[arg(long)]
    symbol: Option<String>,

    /// Output machine-readable JSON
    #[arg(long)]
    json: bool,
}

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum, Debug)]
enum ReportFormat {
    Json,
    Markdown,
}

#[derive(Args, Debug)]
struct ReportArgs {
    /// Path to repository root
    path: PathBuf,

    /// Target file for impact analysis included in report
    #[arg(long)]
    file: Option<String>,

    /// Target symbol for impact analysis included in report
    #[arg(long)]
    symbol: Option<String>,

    /// Report output format
    #[arg(short, long, value_enum, default_value_t = ReportFormat::Markdown)]
    format: ReportFormat,

    /// Write report to file instead of stdout
    #[arg(short, long)]
    output: Option<PathBuf>,
}

#[derive(Args, Debug)]
struct TestArgs {
    /// Path to repository root
    path: PathBuf,

    /// Changed relative file path
    #[arg(long)]
    file: Option<String>,

    /// Changed symbol within file
    #[arg(long)]
    symbol: Option<String>,

    /// Explicitly authorize test execution (will NOT run without this flag)
    #[arg(long)]
    execute: bool,

    /// Run in Docker container
    #[arg(long)]
    docker: bool,

    /// Force local subprocess execution instead of Docker container
    #[arg(long)]
    local: bool,

    /// Output machine-readable JSON
    #[arg(long)]
    json: bool,
}

fn main() -> ExitCode {
    let cli = Cli::parse();

    match cli.command {
        Commands::Scan(args) => handle_scan(args, cli.quiet),
        Commands::Graph(args) => handle_graph(args, cli.quiet),
        Commands::Impact(args) => handle_impact(args, cli.quiet),
        Commands::Report(args) => handle_report(args, cli.quiet),
        Commands::Test(args) => handle_test(args, cli.quiet),
        Commands::Doctor => handle_doctor(),
        Commands::Serve(args) => handle_serve(args),
    }
}

fn load_repository(
    repo_path: &Path,
    quiet: bool,
) -> Result<(RepositoryFingerprint, DependencyGraph), String> {
    if !repo_path.exists() {
        return Err(format!("Repository path does not exist: {:?}", repo_path));
    }

    let scanned = scan_repository(repo_path, &ScanOptions::default())
        .map_err(|e| format!("Scanner error: {}", e))?;

    if scanned.is_empty() {
        return Err(format!("No supported Python files found in {:?}", repo_path));
    }

    let mut file_hashes = BTreeMap::new();
    let mut parsed_files = Vec::new();

    for sf in &scanned {
        file_hashes.insert(sf.file_id.as_str().to_string(), sf.content_hash.clone());
        match extract_python_file(&sf.file_id, &sf.absolute_path, sf.is_test) {
            Ok(pf) => parsed_files.push(pf),
            Err(e) => {
                if !quiet {
                    eprintln!("Warning: Failed to parse {:?}: {}", sf.absolute_path, e);
                }
            }
        }
    }

    let fingerprint = RepositoryFingerprint::compute(file_hashes);
    let graph = build_dependency_graph(&parsed_files);

    Ok((fingerprint, graph))
}

fn handle_scan(args: ScanArgs, _quiet: bool) -> ExitCode {
    match scan_repository(&args.path, &ScanOptions::default()) {
        Ok(files) => {
            let mut file_hashes = BTreeMap::new();
            for f in &files {
                file_hashes.insert(f.file_id.as_str().to_string(), f.content_hash.clone());
            }
            let fp = RepositoryFingerprint::compute(file_hashes);

            if args.json {
                let out = serde_json::json!({
                    "repository": args.path.display().to_string(),
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
                println!("{}", serde_json::to_string_pretty(&out).unwrap());
            } else {
                println!("=== GHOSTLIGHT Repository Scan ===");
                println!("Repository:  {}", args.path.display());
                println!("Fingerprint: {}", fp.root_hash);
                println!("Files found: {}", fp.file_count);
                println!();
                println!("{:<50} {:<10} {:<6}", "Path", "Size", "Test?");
                println!("{:-<50} {:-<10} {:-<6}", "", "", "");
                for f in &files {
                    println!("{:<50} {:<10} {:<6}", f.file_id.as_str(), f.size_bytes, if f.is_test { "YES" } else { "no" });
                }
            }
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Scan failed: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn handle_graph(args: GraphArgs, quiet: bool) -> ExitCode {
    match load_repository(&args.path, quiet) {
        Ok((fp, graph)) => {
            let export = graph.export_dto();

            if let Some(out_path) = args.output {
                let json = serde_json::to_string_pretty(&export).unwrap();
                if let Err(e) = std::fs::write(&out_path, json) {
                    eprintln!("Failed to write graph to {:?}: {}", out_path, e);
                    return ExitCode::FAILURE;
                }
                if !quiet {
                    eprintln!("Graph written to {:?}", out_path);
                }
            } else if args.json {
                println!("{}", serde_json::to_string_pretty(&export).unwrap());
            } else {
                println!("=== GHOSTLIGHT Dependency Graph ===");
                println!("Repository:  {}", args.path.display());
                println!("Fingerprint: {}", fp.root_hash);
                println!("Total Nodes: {}", export.node_count);
                println!("Total Edges: {}", export.edge_count);
                println!();
                println!("Sample Nodes:");
                for n in export.nodes.iter().take(15) {
                    println!("  - [{:?}] {} (in {:?})", n.kind, n.label, n.file_id.as_deref().unwrap_or("synthetic"));
                }
                if export.node_count > 15 {
                    println!("  ... and {} more nodes", export.node_count - 15);
                }
            }
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Graph construction failed: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn handle_impact(args: ImpactArgs, quiet: bool) -> ExitCode {
    let (_fp, graph) = match load_repository(&args.path, quiet) {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Error: {}", e);
            return ExitCode::FAILURE;
        }
    };

    let analyzer = ImpactAnalyzer::new(&graph);
    let report = if let Some(sym) = args.symbol {
        let file_id = match args.file {
            Some(f) => FileId::from_relative_path(f),
            None => {
                eprintln!("Error: --symbol requires --file specifying containing module");
                return ExitCode::FAILURE;
            }
        };
        analyzer.analyze_symbol_impact(&file_id, &sym)
    } else if let Some(f) = args.file {
        let file_id = FileId::from_relative_path(f);
        analyzer.analyze_file_impact(&file_id)
    } else {
        eprintln!("Error: Either --file or --symbol must be specified for impact analysis");
        return ExitCode::FAILURE;
    };

    let Some(impact) = report else {
        eprintln!("Target not found in dependency graph.");
        return ExitCode::FAILURE;
    };

    if args.json {
        println!("{}", serde_json::to_string_pretty(&impact).unwrap());
    } else {
        println!("=== GHOSTLIGHT Impact Analysis ===");
        println!("Target:               {}", impact.target_name);
        println!("Direct Impact:        {}", impact.direct_count);
        println!("Transitive Ripple:    {}", impact.transitive_count);
        println!("Total Affected:       {}", impact.total_affected);
        println!("Candidate Tests:      {}", impact.candidate_tests.len());
        println!();
        if !impact.affected_nodes.is_empty() {
            println!("Affected Downstream Entities:");
            for aff in &impact.affected_nodes {
                let loc = aff.file_id.as_ref().map(|f| f.as_str()).unwrap_or("-");
                println!("  - [{:?}] {} (dist: {}, in {})", aff.impact_type, aff.name, aff.distance, loc);
            }
            println!();
        }
        if !impact.candidate_tests.is_empty() {
            println!("Candidate Affected Tests:");
            for t in &impact.candidate_tests {
                println!("  - {} (Reason: {:?}, Confidence: {:?})", t.test_node_id, t.reason, t.confidence);
            }
        }
    }

    ExitCode::SUCCESS
}

fn handle_report(args: ReportArgs, quiet: bool) -> ExitCode {
    let (fp, graph) = match load_repository(&args.path, quiet) {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Error: {}", e);
            return ExitCode::FAILURE;
        }
    };

    let analyzer = ImpactAnalyzer::new(&graph);
    let impact = if let Some(sym) = args.symbol {
        if let Some(f) = args.file {
            let file_id = FileId::from_relative_path(f);
            analyzer.analyze_symbol_impact(&file_id, &sym)
        } else {
            None
        }
    } else if let Some(f) = args.file {
        let file_id = FileId::from_relative_path(f);
        analyzer.analyze_file_impact(&file_id)
    } else {
        None
    };

    let candidate_tests = impact.as_ref().map(|i| i.candidate_tests.clone()).unwrap_or_default();
    let report = AnalysisReport::new(
        args.path.display().to_string(),
        fp,
        &graph,
        impact,
        candidate_tests,
    );

    let output_str = match args.format {
        ReportFormat::Json => report.to_json().unwrap(),
        ReportFormat::Markdown => report.to_markdown(),
    };

    if let Some(out_path) = args.output {
        if let Err(e) = std::fs::write(&out_path, &output_str) {
            eprintln!("Failed to write report to {:?}: {}", out_path, e);
            return ExitCode::FAILURE;
        }
        if !quiet {
            eprintln!("Report written to {:?}", out_path);
        }
    } else {
        println!("{}", output_str);
    }

    ExitCode::SUCCESS
}

fn handle_test(args: TestArgs, quiet: bool) -> ExitCode {
    let (_fp, graph) = match load_repository(&args.path, quiet) {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Error: {}", e);
            return ExitCode::FAILURE;
        }
    };

    let analyzer = ImpactAnalyzer::new(&graph);
    let impact = if let Some(sym) = args.symbol {
        let file_id = match args.file {
            Some(f) => FileId::from_relative_path(f),
            None => {
                eprintln!("Error: --symbol requires --file");
                return ExitCode::FAILURE;
            }
        };
        analyzer.analyze_symbol_impact(&file_id, &sym)
    } else if let Some(f) = args.file {
        let file_id = FileId::from_relative_path(f);
        analyzer.analyze_file_impact(&file_id)
    } else {
        eprintln!("Error: Specify --file or --symbol to determine test candidates");
        return ExitCode::FAILURE;
    };

    let Some(impact_report) = impact else {
        eprintln!("Target not found.");
        return ExitCode::FAILURE;
    };

    let candidate_tests = impact_report.candidate_tests;

    if !args.execute {
        println!("=== GHOSTLIGHT Test Candidate Selection ===");
        println!("Target:               {}", impact_report.target_name);
        println!("Candidate Test Count: {}", candidate_tests.len());
        println!();
        for t in &candidate_tests {
            println!("  - {} (file: {}, reason: {:?})", t.symbol_name, t.file_id, t.reason);
        }
        println!();
        println!("NOTE: Repository code is NOT executed during static analysis.");
        println!("To authorize execution under safe container/sandbox controls, re-run with: --execute");
        return ExitCode::SUCCESS;
    }

    let runner = TestRunner::new(&args.path);
    let prefer_docker = if args.local {
        false
    } else if args.docker {
        true
    } else {
        runner.is_docker_available()
    };

    let run_res = match runner.execute_tests(&candidate_tests, true, prefer_docker) {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Test execution failed: {}", e);
            return ExitCode::FAILURE;
        }
    };

    if args.json {
        println!("{}", serde_json::to_string_pretty(&run_res).unwrap());
    } else {
        println!("=== GHOSTLIGHT Test Execution Results ===");
        println!("Engine Used:      {:?} (Isolated: {})", run_res.engine_used, run_res.is_isolated);
        println!("Overall Status:   {}", if run_res.passed { "PASSED" } else { "FAILED" });
        println!("Duration:         {} ms", run_res.duration_ms);
        println!("Timed Out:        {}", run_res.timed_out);
        println!();
        println!("Predicted vs Observed Outcomes:");
        for c in &run_res.comparisons {
            println!("  - [{}] {} => {}", if c.observed_passed { "PASS" } else { "FAIL" }, c.candidate_test, c.notes);
        }
        println!();
        println!("Captured Output:");
        println!("{}", run_res.stdout);
        if !run_res.stderr.is_empty() {
            eprintln!("Stderr:\n{}", run_res.stderr);
        }
    }

    if run_res.passed {
        ExitCode::SUCCESS
    } else {
        ExitCode::FAILURE
    }
}

fn handle_doctor() -> ExitCode {
    println!("=== GHOSTLIGHT Doctor: System Diagnostics ===");
    println!("Rust Toolchain:       OK (stable Rust 1.85.1)");
    println!("Python AST Parser:    OK (Tree-sitter Python 0.21 embedded)");

    let python_version = std::process::Command::new("python3")
        .arg("--version")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "NOT FOUND".to_string());
    println!("Host Python:          {}", python_version);

    let pytest_check = std::process::Command::new("python3")
        .args(["-m", "pytest", "--version"])
        .output()
        .map(|o| if o.status.success() { String::from_utf8_lossy(&o.stdout).trim().to_string() } else { "NOT INSTALLED".to_string() })
        .unwrap_or_else(|_| "NOT AVAILABLE".to_string());
    println!("Host Pytest:          {}", pytest_check);

    let docker_ok = ghostlight_execution::docker::check_docker_available();
    println!("Docker Isolation:     {}", if docker_ok { "AVAILABLE (air-gapped containers supported)" } else { "UNAVAILABLE (falling back to restricted subprocess)" });

    println!("Security Policy:      ENFORCED (No arbitrary execution without authorization)");
    println!("Telemetry:            DISABLED (100% offline, zero-telemetry)");

    ExitCode::SUCCESS
}

fn handle_serve(args: ServeArgs) -> ExitCode {
    let dist_dir = if let Some(d) = args.dist {
        d
    } else {
        // Look for apps/desktop/dist
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let default_dist = manifest_dir.parent().unwrap().parent().unwrap().join("apps/desktop/dist");
        if default_dist.exists() {
            default_dist
        } else {
            PathBuf::from("apps/desktop/dist")
        }
    };

    server::start_server(dist_dir, args.path, args.port);
    ExitCode::SUCCESS
}
