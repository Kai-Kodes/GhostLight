use ghostlight_core::{FileId, NodeId};
use ghostlight_graph::{build_dependency_graph, GraphQuery};
use ghostlight_parser::extract_python_source;

#[test]
fn test_transitive_reachability_and_shortest_path() {
    let service_a = r#"
def lower_layer():
    return 10
"#;
    let service_b = r#"
from .a import lower_layer

def mid_layer():
    return lower_layer() + 5
"#;
    let service_c = r#"
from .b import mid_layer

def top_layer():
    return mid_layer() * 2
"#;
    let test_c = r#"
from .c import top_layer

def test_top():
    assert top_layer() == 30
"#;

    let f_a = FileId::from_relative_path("app/a.py");
    let f_b = FileId::from_relative_path("app/b.py");
    let f_c = FileId::from_relative_path("app/c.py");
    let f_t = FileId::from_relative_path("app/test_top.py");

    let p_a = extract_python_source(&f_a, service_a, false).unwrap();
    let p_b = extract_python_source(&f_b, service_b, false).unwrap();
    let p_c = extract_python_source(&f_c, service_c, false).unwrap();
    let p_t = extract_python_source(&f_t, test_c, true).unwrap();

    let graph = build_dependency_graph(&[p_a, p_b, p_c, p_t]);
    let query = GraphQuery::new(&graph);

    let sym_lower = NodeId::for_symbol(&f_a, "lower_layer");
    let sym_mid = NodeId::for_symbol(&f_b, "mid_layer");
    let sym_top = NodeId::for_symbol(&f_c, "top_layer");
    let sym_test = NodeId::for_symbol(&f_t, "test_top");

    // Blast radius: what depends on lower_layer?
    let dependents = query.transitive_dependents(&sym_lower);
    assert!(dependents.iter().any(|n| n.id == sym_mid));
    assert!(dependents.iter().any(|n| n.id == sym_top));
    assert!(dependents.iter().any(|n| n.id == sym_test));

    // Shortest explanatory path: lower_layer -> test_top
    // Notice in call graph: test_top -> top_layer -> mid_layer -> lower_layer
    // So forward path from test_top to lower_layer:
    let path = query.shortest_path(&sym_test, &sym_lower).expect("Should find path from test to callee");
    assert_eq!(path.source, sym_test);
    assert_eq!(path.target, sym_lower);
    assert_eq!(path.hop_count, 3);
    assert_eq!(path.steps[0].to, sym_top);
    assert_eq!(path.steps[1].to, sym_mid);
    assert_eq!(path.steps[2].to, sym_lower);
}

#[test]
fn test_circular_dependency_detection() {
    let module_x = r#"
from .y import func_y

def func_x():
    return func_y()
"#;
    let module_y = r#"
from .x import func_x

def func_y():
    return func_x()
"#;
    let f_x = FileId::from_relative_path("cycle/x.py");
    let f_y = FileId::from_relative_path("cycle/y.py");

    let p_x = extract_python_source(&f_x, module_x, false).unwrap();
    let p_y = extract_python_source(&f_y, module_y, false).unwrap();

    let graph = build_dependency_graph(&[p_x, p_y]);
    let query = GraphQuery::new(&graph);

    let cycles = query.find_cycles();
    assert!(!cycles.is_empty(), "Should detect cycle between x.py and y.py");
}
