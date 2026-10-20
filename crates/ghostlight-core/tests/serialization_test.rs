use ghostlight_core::*;
use std::collections::BTreeMap;

#[test]
fn test_node_and_edge_serialization_roundtrip() {
    let file_id = FileId::from_relative_path("src/service.py");
    let loc_start = SourceLocation::new(10, 5, 120);
    let loc_end = SourceLocation::new(25, 1, 350);
    let range = SourceRange::new(loc_start, loc_end);

    let node = NodeData::new_symbol(
        file_id.clone(),
        "process_order".to_string(),
        NodeKind::Function,
        Some(range),
        SymbolVisibility::Public,
        Some("Processes the customer order.".to_string()),
        false,
    );

    let json = serde_json::to_string_pretty(&node).expect("serialize node");
    let deserialized: NodeData = serde_json::from_str(&json).expect("deserialize node");
    assert_eq!(node, deserialized);

    let edge = EdgeData::new(EdgeType::Calls, Confidence::Static, ResolutionStatus::Resolved)
        .with_range(range);
    let edge_json = serde_json::to_string(&edge).expect("serialize edge");
    let deserialized_edge: EdgeData = serde_json::from_str(&edge_json).expect("deserialize edge");
    assert_eq!(edge, deserialized_edge);
}

#[test]
fn test_fingerprint_serialization() {
    let mut map = BTreeMap::new();
    map.insert("main.py".to_string(), ContentHash::new("abcdef1234567890"));
    let fp = RepositoryFingerprint::compute(map);

    let json = serde_json::to_string(&fp).expect("serialize fingerprint");
    let deserialized: RepositoryFingerprint =
        serde_json::from_str(&json).expect("deserialize fingerprint");
    assert_eq!(fp, deserialized);
}
