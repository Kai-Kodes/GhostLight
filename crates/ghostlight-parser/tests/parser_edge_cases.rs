use ghostlight_core::FileId;
use ghostlight_parser::extract_python_source;

#[test]
fn test_malformed_syntax_recovery() {
    let bad_code = r#"
def broken_function(:
    pass

class Incomplete
    def ok_method(self):
        return 42

def valid_func():
    return ok_method()
"#;
    let file_id = FileId::from_relative_path("src/broken.py");
    // Tree-sitter is error-tolerant; it recovers and still extracts what it can without crashing
    let parsed = extract_python_source(&file_id, bad_code, false).expect("Parser should not crash on syntax errors");
    assert!(parsed.functions.iter().any(|f| f.name == "valid_func"));
}

#[test]
fn test_empty_and_whitespace_file() {
    let file_id = FileId::from_relative_path("src/empty.py");
    let parsed = extract_python_source(&file_id, "   \n\n  \t  \n", false).unwrap();
    assert!(parsed.imports.is_empty());
    assert!(parsed.classes.is_empty());
    assert!(parsed.functions.is_empty());
    assert!(parsed.calls.is_empty());
}

#[test]
fn test_async_and_decorators() {
    let code = r#"
@pytest.fixture
def sample_fixture():
    return {"key": "value"}

@router.get("/items")
@authenticate(role="admin")
async def get_items():
    res = await fetch_all()
    return res
"#;
    let file_id = FileId::from_relative_path("src/api.py");
    let parsed = extract_python_source(&file_id, code, false).unwrap();
    let get_items = parsed.functions.iter().find(|f| f.name == "get_items").unwrap();
    assert!(get_items.is_async);
    assert!(!get_items.is_method);
}

#[test]
fn test_wildcard_and_relative_imports() {
    let code = r#"
from ...models.user import *
from .helpers import (
    calc,
    format_currency as fmt,
)
"#;
    let file_id = FileId::from_relative_path("src/views/detail.py");
    let parsed = extract_python_source(&file_id, code, false).unwrap();
    assert_eq!(parsed.imports.len(), 2);

    let star_import = &parsed.imports[0];
    assert!(star_import.is_star);
    assert_eq!(star_import.level, 3);
    assert_eq!(star_import.module.as_deref(), Some("models.user"));

    let rel_import = &parsed.imports[1];
    assert_eq!(rel_import.level, 1);
    assert_eq!(rel_import.module.as_deref(), Some("helpers"));
    assert!(rel_import.names.iter().any(|(n, a)| n == "format_currency" && a.as_deref() == Some("fmt")));
}
