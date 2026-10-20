use crate::graph::DependencyGraph;
use ghostlight_core::{
    Confidence, EdgeData, EdgeType, FileId, NodeData, NodeId, NodeKind, ResolutionStatus,
    SymbolVisibility,
};
use ghostlight_parser::ParsedPythonFile;
use std::collections::HashMap;

/// Constructs a semantic DependencyGraph from a collection of parsed Python files.
pub fn build_dependency_graph(parsed_files: &[ParsedPythonFile]) -> DependencyGraph {
    let mut graph = DependencyGraph::new();

    // Map: file_id -> list of imported symbol names mapped to source target NodeId
    // e.g. "sqrt" -> NodeId("symbol:src/math.py::sqrt")
    let mut file_imported_symbols: HashMap<FileId, HashMap<String, NodeId>> = HashMap::new();

    // Pass 1: Register all files, modules, classes, and functions as nodes
    for parsed in parsed_files {
        let file_id = &parsed.file_id;

        // Register file node
        let file_node = NodeData::new_file(file_id.clone(), parsed.is_test_file);
        let file_node_id = file_node.id.clone();
        graph.add_or_update_node(file_node);

        // Register module path mappings
        let mod_name = file_id.to_python_module_name();
        graph.register_module(mod_name.clone(), file_id.clone());

        // Also if file ends with __init__.py, package name also resolves here
        if file_id.as_str().ends_with("/__init__.py") {
            let pkg_name = file_id
                .as_str()
                .trim_end_matches("/__init__.py")
                .replace('/', ".");
            graph.register_module(pkg_name, file_id.clone());
        }

        // Register classes
        for class_def in &parsed.classes {
            let class_node = NodeData::new_symbol(
                file_id.clone(),
                class_def.name.clone(),
                NodeKind::Class,
                Some(class_def.range),
                SymbolVisibility::Public,
                class_def.docstring.clone(),
                class_def.is_test,
            );
            let class_node_id = class_node.id.clone();
            graph.add_or_update_node(class_node);

            // Edge: File -> Defines -> Class
            let _ = graph.add_edge(
                &file_node_id,
                &class_node_id,
                EdgeData::new(
                    EdgeType::Defines,
                    Confidence::Static,
                    ResolutionStatus::Resolved,
                ),
            );
        }

        // Register functions and methods
        for func_def in &parsed.functions {
            let kind = if func_def.is_method {
                NodeKind::Method
            } else if func_def.is_test {
                NodeKind::Test
            } else {
                NodeKind::Function
            };

            let qualified = func_def.qualified_name();
            let func_node = NodeData::new_symbol(
                file_id.clone(),
                qualified.clone(),
                kind,
                Some(func_def.range),
                SymbolVisibility::Public,
                func_def.docstring.clone(),
                func_def.is_test,
            );
            let func_node_id = func_node.id.clone();
            graph.add_or_update_node(func_node);

            if let Some(scope_class) = &func_def.scope {
                // Method: Class -> Defines -> Method
                let class_node_id = NodeId::for_symbol(file_id, scope_class);
                let _ = graph.add_edge(
                    &class_node_id,
                    &func_node_id,
                    EdgeData::new(
                        EdgeType::Defines,
                        Confidence::Static,
                        ResolutionStatus::Resolved,
                    ),
                );
            } else {
                // Top-level function: File -> Defines -> Function
                let _ = graph.add_edge(
                    &file_node_id,
                    &func_node_id,
                    EdgeData::new(
                        EdgeType::Defines,
                        Confidence::Static,
                        ResolutionStatus::Resolved,
                    ),
                );
            }
        }
    }

    // Pass 2: Resolve Imports
    for parsed in parsed_files {
        let file_id = &parsed.file_id;
        let file_node_id = NodeId::for_file(file_id);
        let imported_map = file_imported_symbols.entry(file_id.clone()).or_default();

        for imp in &parsed.imports {
            let target_module_name = if imp.level > 0 {
                // Relative import: resolve relative to current file's directory
                resolve_relative_module(file_id, imp.level, imp.module.as_deref())
            } else {
                imp.module.clone()
            };

            if let Some(mod_name) = &target_module_name {
                if let Some(target_file_id) = graph.resolve_module(mod_name).cloned() {
                    let target_file_node_id = NodeId::for_file(&target_file_id);

                    // Edge: File -> Imports -> Target File
                    let _ = graph.add_edge(
                        &file_node_id,
                        &target_file_node_id,
                        EdgeData::new(
                            EdgeType::Imports,
                            Confidence::Static,
                            ResolutionStatus::Resolved,
                        )
                        .with_range(imp.range),
                    );

                    // If names are imported from that module (`from mod import foo`)
                    for (orig_name, alias) in &imp.names {
                        let sym_node_id = NodeId::for_symbol(&target_file_id, orig_name);
                        if graph.get_node(&sym_node_id).is_some() {
                            let _ = graph.add_edge(
                                &file_node_id,
                                &sym_node_id,
                                EdgeData::new(
                                    EdgeType::Imports,
                                    Confidence::Static,
                                    ResolutionStatus::Resolved,
                                )
                                .with_range(imp.range),
                            );

                            let local_alias = alias.as_deref().unwrap_or(orig_name);
                            imported_map.insert(local_alias.to_string(), sym_node_id);
                        } else {
                            // Submodule import e.g. `from pkg import submodule`
                            let sub_mod = format!("{}.{}", mod_name, orig_name);
                            if let Some(sub_file) = graph.resolve_module(&sub_mod).cloned() {
                                let sub_file_node_id = NodeId::for_file(&sub_file);
                                let _ = graph.add_edge(
                                    &file_node_id,
                                    &sub_file_node_id,
                                    EdgeData::new(
                                        EdgeType::Imports,
                                        Confidence::Static,
                                        ResolutionStatus::Resolved,
                                    )
                                    .with_range(imp.range),
                                );
                                let local_alias = alias.as_deref().unwrap_or(orig_name);
                                imported_map.insert(local_alias.to_string(), sub_file_node_id);
                            }
                        }
                    }
                } else {
                    // External dependency (e.g. standard library or pip package)
                    let ext_id = NodeId::for_external(mod_name);
                    let ext_node = NodeData {
                        id: ext_id.clone(),
                        name: mod_name.clone(),
                        kind: NodeKind::ExternalModule,
                        file_id: None,
                        range: None,
                        visibility: SymbolVisibility::Public,
                        docstring: None,
                        is_test: false,
                    };
                    graph.add_or_update_node(ext_node);
                    let _ = graph.add_edge(
                        &file_node_id,
                        &ext_id,
                        EdgeData::new(
                            EdgeType::Imports,
                            Confidence::Static,
                            ResolutionStatus::Unresolved,
                        )
                        .with_range(imp.range),
                    );
                }
            }
        }
    }

    // Pass 3: Resolve Class Inheritance
    for parsed in parsed_files {
        let file_id = &parsed.file_id;
        let imported_map = file_imported_symbols.get(file_id);

        for class_def in &parsed.classes {
            let class_node_id = NodeId::for_symbol(file_id, &class_def.name);

            for base in &class_def.bases {
                // Check local file first
                let local_base_id = NodeId::for_symbol(file_id, base);
                if graph.get_node(&local_base_id).is_some() {
                    let _ = graph.add_edge(
                        &class_node_id,
                        &local_base_id,
                        EdgeData::new(
                            EdgeType::Inherits,
                            Confidence::Static,
                            ResolutionStatus::Resolved,
                        ),
                    );
                } else if let Some(imported_target) = imported_map.and_then(|m| m.get(base)) {
                    // Inherits from imported class
                    let _ = graph.add_edge(
                        &class_node_id,
                        imported_target,
                        EdgeData::new(
                            EdgeType::Inherits,
                            Confidence::Static,
                            ResolutionStatus::Resolved,
                        ),
                    );
                } else {
                    // Check if base matches any known class globally
                    let global_matches = graph.nodes_for_symbol(base);
                    if global_matches.len() == 1 {
                        let target_id = graph.inner_graph()[global_matches[0]].id.clone();
                        let _ = graph.add_edge(
                            &class_node_id,
                            &target_id,
                            EdgeData::new(
                                EdgeType::Inherits,
                                Confidence::Heuristic,
                                ResolutionStatus::Resolved,
                            ),
                        );
                    }
                }
            }
        }
    }

    // Pass 4: Resolve Calls
    for parsed in parsed_files {
        let file_id = &parsed.file_id;
        let imported_map = file_imported_symbols.get(file_id);

        for call in &parsed.calls {
            let caller_node_id = match &call.caller_symbol {
                Some(symbol_name) => NodeId::for_symbol(file_id, symbol_name),
                None => NodeId::for_file(file_id),
            };

            let callee_raw = &call.callee;

            // Handle method call `self.foo` or `cls.foo`
            if callee_raw.starts_with("self.") || callee_raw.starts_with("cls.") {
                let method_name = callee_raw.split('.').nth(1).unwrap_or("");
                if let Some(caller_sym) = &call.caller_symbol {
                    if let Some(class_name) = caller_sym.split("::").next() {
                        let qualified_target = format!("{}::{}", class_name, method_name);
                        let target_id = NodeId::for_symbol(file_id, &qualified_target);
                        if graph.get_node(&target_id).is_some() {
                            let _ = graph.add_edge(
                                &caller_node_id,
                                &target_id,
                                EdgeData::new(
                                    EdgeType::Calls,
                                    Confidence::Static,
                                    ResolutionStatus::Resolved,
                                )
                                .with_range(call.range),
                            );
                            continue;
                        }
                    }
                }
            }

            // Direct function call `helper()` or `Dog()`
            let callee_ident = callee_raw.split('(').next().unwrap_or(callee_raw).trim();

            // 1. Local symbol
            let local_target = NodeId::for_symbol(file_id, callee_ident);
            if graph.get_node(&local_target).is_some() {
                let _ = graph.add_edge(
                    &caller_node_id,
                    &local_target,
                    EdgeData::new(
                        EdgeType::Calls,
                        Confidence::Static,
                        ResolutionStatus::Resolved,
                    )
                    .with_range(call.range),
                );
                continue;
            }

            // 2. Imported symbol
            if let Some(imported_target) = imported_map.and_then(|m| m.get(callee_ident)) {
                let _ = graph.add_edge(
                    &caller_node_id,
                    imported_target,
                    EdgeData::new(
                        EdgeType::Calls,
                        Confidence::Static,
                        ResolutionStatus::Resolved,
                    )
                    .with_range(call.range),
                );
                continue;
            }

            // 3. Member call on imported module: `math_utils.calculate()`
            if callee_ident.contains('.') {
                let parts: Vec<&str> = callee_ident.split('.').collect();
                if parts.len() == 2 {
                    let (obj_name, member_name) = (parts[0], parts[1]);
                    if let Some(imported_target) = imported_map.and_then(|m| m.get(obj_name)) {
                        if imported_target.is_file() {
                            if let Some(target_file) = imported_target.file_id() {
                                let member_id = NodeId::for_symbol(&target_file, member_name);
                                if graph.get_node(&member_id).is_some() {
                                    let _ = graph.add_edge(
                                        &caller_node_id,
                                        &member_id,
                                        EdgeData::new(
                                            EdgeType::Calls,
                                            Confidence::Static,
                                            ResolutionStatus::Resolved,
                                        )
                                        .with_range(call.range),
                                    );
                                    continue;
                                }
                            }
                        }
                    }
                }
            }

            // 4. Global match heuristic if uniquely identifiable
            let matches = graph.nodes_for_symbol(callee_ident);
            if matches.len() == 1 {
                let target_id = graph.inner_graph()[matches[0]].id.clone();
                let _ = graph.add_edge(
                    &caller_node_id,
                    &target_id,
                    EdgeData::new(
                        EdgeType::Calls,
                        Confidence::Heuristic,
                        ResolutionStatus::Resolved,
                    )
                    .with_range(call.range),
                );
            }
        }
    }

    graph
}

/// Resolves relative Python module name (e.g. file `a/b/c.py`, level 1 -> `a.b`, level 2 -> `a`).
fn resolve_relative_module(file_id: &FileId, level: usize, sub_module: Option<&str>) -> Option<String> {
    let path_str = file_id.as_str();
    let parts: Vec<&str> = path_str.split('/').collect();

    // The directory containing the file is at index `parts.len() - 1`
    let dir_parts = if parts.len() > 1 {
        &parts[..parts.len() - 1]
    } else {
        &[]
    };

    if level > dir_parts.len() + 1 {
        return None;
    }

    let up = level.saturating_sub(1);
    let target_dir_len = dir_parts.len().saturating_sub(up);
    let mut resolved_parts: Vec<&str> = dir_parts[..target_dir_len].to_vec();

    if let Some(sub) = sub_module {
        resolved_parts.push(sub);
    }

    if resolved_parts.is_empty() {
        None
    } else {
        Some(resolved_parts.join("."))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ghostlight_parser::extract_python_source;

    #[test]
    fn test_build_dependency_graph() {
        let utils_code = r#"
def format_data(s):
    return s.strip().lower()
"#;
        let main_code = r#"
from .utils import format_data

def run():
    msg = format_data("  HELLO  ")
    print(msg)
"#;
        let test_code = r#"
from .main import run

def test_run():
    run()
"#;
        let f_utils = FileId::from_relative_path("pkg/utils.py");
        let f_main = FileId::from_relative_path("pkg/main.py");
        let f_test = FileId::from_relative_path("pkg/test_app.py");

        let p_utils = extract_python_source(&f_utils, utils_code, false).unwrap();
        let p_main = extract_python_source(&f_main, main_code, false).unwrap();
        let p_test = extract_python_source(&f_test, test_code, true).unwrap();

        let graph = build_dependency_graph(&[p_utils, p_main, p_test]);

        assert!(graph.node_count() > 0);

        let main_file_id = NodeId::for_file(&f_main);
        let utils_file_id = NodeId::for_file(&f_utils);

        // Main should import utils
        let deps = graph.direct_dependencies(&main_file_id);
        assert!(deps.iter().any(|(node, edge)| node.id == utils_file_id && edge.edge_type == EdgeType::Imports));

        // run() in main should call format_data in utils
        let run_sym = NodeId::for_symbol(&f_main, "run");
        let format_sym = NodeId::for_symbol(&f_utils, "format_data");
        let run_deps = graph.direct_dependencies(&run_sym);
        assert!(run_deps.iter().any(|(node, edge)| node.id == format_sym && edge.edge_type == EdgeType::Calls));

        // test_run should call run()
        let test_sym = NodeId::for_symbol(&f_test, "test_run");
        let test_deps = graph.direct_dependencies(&test_sym);
        assert!(test_deps.iter().any(|(node, edge)| node.id == run_sym && edge.edge_type == EdgeType::Calls));
    }
}
