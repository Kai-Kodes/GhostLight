use crate::error::ParserError;
use ghostlight_core::{FileId, SourceLocation, SourceRange};
use std::path::Path;
use tree_sitter::{Node, Parser};

/// A single import or from-import statement.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportStatement {
    pub module: Option<String>,
    pub names: Vec<(String, Option<String>)>, // (imported_name, alias)
    pub is_from: bool,
    pub level: usize, // 0 for absolute, 1 for '.', 2 for '..', etc.
    pub is_star: bool,
    pub range: SourceRange,
}

/// A parsed class definition.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ClassDef {
    pub name: String,
    pub bases: Vec<String>,
    pub decorators: Vec<String>,
    pub docstring: Option<String>,
    pub range: SourceRange,
    pub is_test: bool,
}

/// A parsed function or method definition.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FunctionDef {
    pub name: String,
    pub scope: Option<String>, // e.g. "ClassName" if inside a class
    pub is_async: bool,
    pub is_method: bool,
    pub decorators: Vec<String>,
    pub docstring: Option<String>,
    pub range: SourceRange,
    pub is_test: bool,
}

impl FunctionDef {
    /// Qualified name such as `Class::method` or `function_name`.
    pub fn qualified_name(&self) -> String {
        match &self.scope {
            Some(class_name) => format!("{}::{}", class_name, self.name),
            None => self.name.clone(),
        }
    }
}

/// A call expression occurring within a file or symbol.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CallExpression {
    pub callee: String,
    pub caller_symbol: Option<String>,
    pub range: SourceRange,
}

/// Complete structural metadata extracted from a Python source file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedPythonFile {
    pub file_id: FileId,
    pub is_test_file: bool,
    pub imports: Vec<ImportStatement>,
    pub classes: Vec<ClassDef>,
    pub functions: Vec<FunctionDef>,
    pub calls: Vec<CallExpression>,
}

const MAX_AST_DEPTH: usize = 256;

/// Parses a Python source string into structured metadata.
pub fn extract_python_source(
    file_id: &FileId,
    source_code: &str,
    is_test_file: bool,
) -> Result<ParsedPythonFile, ParserError> {
    let mut parser = Parser::new();
    let language = tree_sitter_python::language();
    parser
        .set_language(&language)
        .map_err(|_| ParserError::LanguageInitFailed)?;

    let tree = parser
        .parse(source_code, None)
        .ok_or_else(|| ParserError::ParseFailed {
            path: file_id.to_path_buf(),
        })?;

    let root_node = tree.root_node();
    let source_bytes = source_code.as_bytes();

    let mut extractor = AstExtractor {
        file_id: file_id.clone(),
        is_test_file,
        source_bytes,
        imports: Vec::new(),
        classes: Vec::new(),
        functions: Vec::new(),
        calls: Vec::new(),
        current_scope: None,
        current_function: None,
    };

    extractor.visit_node(root_node, 0)?;

    Ok(ParsedPythonFile {
        file_id: file_id.clone(),
        is_test_file,
        imports: extractor.imports,
        classes: extractor.classes,
        functions: extractor.functions,
        calls: extractor.calls,
    })
}

/// Helper that reads file contents and runs extraction.
pub fn extract_python_file<P: AsRef<Path>>(
    file_id: &FileId,
    path: P,
    is_test_file: bool,
) -> Result<ParsedPythonFile, ParserError> {
    let source = std::fs::read_to_string(path.as_ref()).map_err(|e| ParserError::Io {
        path: path.as_ref().to_path_buf(),
        source: e,
    })?;
    extract_python_source(file_id, &source, is_test_file)
}

struct AstExtractor<'a> {
    file_id: FileId,
    is_test_file: bool,
    source_bytes: &'a [u8],
    imports: Vec<ImportStatement>,
    classes: Vec<ClassDef>,
    functions: Vec<FunctionDef>,
    calls: Vec<CallExpression>,
    current_scope: Option<String>,
    current_function: Option<String>,
}

impl<'a> AstExtractor<'a> {
    fn node_text(&self, node: Node) -> &str {
        node.utf8_text(self.source_bytes).unwrap_or("")
    }

    fn node_range(&self, node: Node) -> SourceRange {
        let start_pos = node.start_position();
        let end_pos = node.end_position();
        let start = SourceLocation::new(start_pos.row + 1, start_pos.column + 1, node.start_byte());
        let end = SourceLocation::new(end_pos.row + 1, end_pos.column + 1, node.end_byte());
        SourceRange::new(start, end)
    }

    fn visit_node(&mut self, node: Node, depth: usize) -> Result<(), ParserError> {
        if depth > MAX_AST_DEPTH {
            return Err(ParserError::RecursionLimitExceeded { depth });
        }

        match node.kind() {
            "import_statement" => {
                self.extract_import(node);
            }
            "import_from_statement" => {
                self.extract_import_from(node);
            }
            "decorated_definition" => {
                let mut decorators = Vec::new();
                let mut def_node = None;
                let mut cursor = node.walk();
                for child in node.children(&mut cursor) {
                    if child.kind() == "decorator" {
                        decorators.push(self.node_text(child).trim().to_string());
                    } else if matches!(
                        child.kind(),
                        "function_definition"
                            | "async_function_definition"
                            | "class_definition"
                    ) {
                        def_node = Some(child);
                    }
                }
                if let Some(def) = def_node {
                    match def.kind() {
                        "class_definition" => {
                            self.extract_class_with_decorators(def, decorators, depth)?;
                        }
                        "function_definition" | "async_function_definition" => {
                            self.extract_function_with_decorators(def, decorators, depth)?;
                        }
                        _ => {}
                    }
                }
                return Ok(());
            }
            "class_definition" => {
                self.extract_class_with_decorators(node, Vec::new(), depth)?;
                return Ok(());
            }
            "function_definition" | "async_function_definition" => {
                self.extract_function_with_decorators(node, Vec::new(), depth)?;
                return Ok(());
            }
            "call" => {
                self.extract_call(node);
                // Continue visiting arguments for nested calls
                let mut cursor = node.walk();
                for child in node.children(&mut cursor) {
                    self.visit_node(child, depth + 1)?;
                }
                return Ok(());
            }
            _ => {
                let mut cursor = node.walk();
                for child in node.children(&mut cursor) {
                    self.visit_node(child, depth + 1)?;
                }
            }
        }

        Ok(())
    }

    fn extract_import(&mut self, node: Node) {
        let range = self.node_range(node);
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            match child.kind() {
                "dotted_name" => {
                    let name = self.node_text(child).to_string();
                    self.imports.push(ImportStatement {
                        module: Some(name.clone()),
                        names: vec![(name, None)],
                        is_from: false,
                        level: 0,
                        is_star: false,
                        range,
                    });
                }
                "aliased_import" => {
                    if let Some(orig) = child.child_by_field_name("name") {
                        let orig_name = self.node_text(orig).to_string();
                        let alias_name = child
                            .child_by_field_name("alias")
                            .map(|a| self.node_text(a).to_string());
                        self.imports.push(ImportStatement {
                            module: Some(orig_name.clone()),
                            names: vec![(orig_name, alias_name)],
                            is_from: false,
                            level: 0,
                            is_star: false,
                            range,
                        });
                    }
                }
                _ => {}
            }
        }
    }

    fn extract_import_from(&mut self, node: Node) {
        let range = self.node_range(node);
        let mut module_name: Option<String> = None;
        let mut level = 0;
        let mut is_star = false;
        let mut names = Vec::new();

        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            match child.kind() {
                "relative_import" => {
                    // Counts leading dots
                    let text = self.node_text(child);
                    let dots = text.chars().take_while(|c| *c == '.').count();
                    level = dots;
                    let remaining = text.trim_start_matches('.');
                    if !remaining.is_empty() {
                        module_name = Some(remaining.to_string());
                    }
                }
                "dotted_name" => {
                    if module_name.is_none() {
                        module_name = Some(self.node_text(child).to_string());
                    } else {
                        let text = self.node_text(child).to_string();
                        names.push((text, None));
                    }
                }
                "identifier" => {
                    let text = self.node_text(child).to_string();
                    names.push((text, None));
                }
                "wildcard_import" => {
                    is_star = true;
                }
                "aliased_import" => {
                    if let Some(orig) = child.child_by_field_name("name") {
                        let orig_name = self.node_text(orig).to_string();
                        let alias_name = child
                            .child_by_field_name("alias")
                            .map(|a| self.node_text(a).to_string());
                        names.push((orig_name, alias_name));
                    }
                }
                _ => {}
            }
        }

        self.imports.push(ImportStatement {
            module: module_name,
            names,
            is_from: true,
            level,
            is_star,
            range,
        });
    }

    fn extract_class_with_decorators(
        &mut self,
        node: Node,
        decorators: Vec<String>,
        depth: usize,
    ) -> Result<(), ParserError> {
        let range = self.node_range(node);
        let name = node
            .child_by_field_name("name")
            .map(|n| self.node_text(n).to_string())
            .unwrap_or_else(|| "<anonymous_class>".to_string());

        let mut bases = Vec::new();
        if let Some(superclasses) = node.child_by_field_name("superclasses") {
            let mut cursor = superclasses.walk();
            for child in superclasses.children(&mut cursor) {
                match child.kind() {
                    "identifier" | "attribute" => {
                        bases.push(self.node_text(child).to_string());
                    }
                    _ => {}
                }
            }
        }

        let is_test = self.is_test_file || name.starts_with("Test");

        self.classes.push(ClassDef {
            name: name.clone(),
            bases,
            decorators,
            docstring: None,
            range,
            is_test,
        });

        // Traverse class body with class name as scope
        let old_scope = self.current_scope.replace(name);
        if let Some(body) = node.child_by_field_name("body") {
            let mut cursor = body.walk();
            for child in body.children(&mut cursor) {
                self.visit_node(child, depth + 1)?;
            }
        }
        self.current_scope = old_scope;

        Ok(())
    }

    fn extract_function_with_decorators(
        &mut self,
        node: Node,
        decorators: Vec<String>,
        depth: usize,
    ) -> Result<(), ParserError> {
        let range = self.node_range(node);
        // In tree-sitter-python, async functions may be `async_function_definition` or
        // `function_definition` with an `async` keyword child or field.
        let mut is_async = node.kind() == "async_function_definition";
        if !is_async {
            let mut cursor = node.walk();
            for child in node.children(&mut cursor) {
                if child.kind() == "async" {
                    is_async = true;
                    break;
                }
            }
        }
        let name = node
            .child_by_field_name("name")
            .map(|n| self.node_text(n).to_string())
            .unwrap_or_else(|| "<anonymous_func>".to_string());

        let is_method = self.current_scope.is_some();
        let is_test = self.is_test_file
            || name.starts_with("test_")
            || name == "runTest"
            || self.current_scope.as_deref().map(|s| s.starts_with("Test")).unwrap_or(false);

        let func_def = FunctionDef {
            name: name.clone(),
            scope: self.current_scope.clone(),
            is_async,
            is_method,
            decorators,
            docstring: None,
            range,
            is_test,
        };

        let qualified = func_def.qualified_name();
        self.functions.push(func_def);

        let old_function = self.current_function.replace(qualified);
        if let Some(body) = node.child_by_field_name("body") {
            let mut cursor = body.walk();
            for child in body.children(&mut cursor) {
                self.visit_node(child, depth + 1)?;
            }
        }
        self.current_function = old_function;

        Ok(())
    }

    fn extract_call(&mut self, node: Node) {
        if let Some(function_node) = node.child_by_field_name("function") {
            let callee_text = self.node_text(function_node).trim().to_string();
            if !callee_text.is_empty() {
                self.calls.push(CallExpression {
                    callee: callee_text,
                    caller_symbol: self.current_function.clone(),
                    range: self.node_range(node),
                });
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_python_comprehensive() {
        let code = r#"
import os
import sys as system
from math import sqrt, pi as PI
from .utils import helper
from ..core.engine import Engine

class Animal:
    def speak(self):
        return "sound"

class Dog(Animal):
    def bark(self):
        msg = self.speak()
        print(msg)
        return helper(msg)

def standalone_func(x):
    dog = Dog()
    return dog.bark()

class TestDogSuite:
    def test_bark_positive(self):
        assert standalone_func(1) is not None
"#;
        let file_id = FileId::from_relative_path("src/pets.py");
        let parsed = extract_python_source(&file_id, code, false).unwrap();

        // Check imports
        assert!(parsed.imports.iter().any(|i| i.module.as_deref() == Some("os")));
        assert!(parsed.imports.iter().any(|i| i.names.iter().any(|(n, a)| n == "sys" && a.as_deref() == Some("system"))));
        assert!(parsed.imports.iter().any(|i| i.level == 1 && i.module.as_deref() == Some("utils")));
        assert!(parsed.imports.iter().any(|i| i.level == 2 && i.module.as_deref() == Some("core.engine")));

        // Check classes
        let animal = parsed.classes.iter().find(|c| c.name == "Animal").unwrap();
        assert!(animal.bases.is_empty());
        let dog = parsed.classes.iter().find(|c| c.name == "Dog").unwrap();
        assert_eq!(dog.bases, vec!["Animal".to_string()]);

        // Check functions & methods
        assert!(parsed.functions.iter().any(|f| f.qualified_name() == "Animal::speak"));
        assert!(parsed.functions.iter().any(|f| f.qualified_name() == "Dog::bark"));
        assert!(parsed.functions.iter().any(|f| f.qualified_name() == "standalone_func"));
        let test_func = parsed.functions.iter().find(|f| f.name == "test_bark_positive").unwrap();
        assert!(test_func.is_test);

        // Check calls
        assert!(parsed.calls.iter().any(|c| c.callee == "self.speak" && c.caller_symbol.as_deref() == Some("Dog::bark")));
        assert!(parsed.calls.iter().any(|c| c.callee == "helper" && c.caller_symbol.as_deref() == Some("Dog::bark")));
        assert!(parsed.calls.iter().any(|c| c.callee == "Dog" && c.caller_symbol.as_deref() == Some("standalone_func")));
    }
}
