//! Port of the Babel implementation's `removeUnusedVariables`: after
//! function-level directive extraction the client build replaces function
//! bodies with references, so anything only those bodies used — including
//! now-unneeded imports — must go. That is the server-code-leak guarantee.
//!
//! Babel repeats scope-crawl + removal passes until a pass removes nothing.
//! This port does the same but re-parses the printed output between passes so
//! `oxc_semantic`'s reference counts stay exact against fresh spans. As a
//! consequence the pass operates code-to-code rather than on the live AST.

use oxc_allocator::Allocator;
use oxc_ast::ast::{BindingPattern, Program, Statement};
use oxc_ast_visit::{walk_mut, VisitMut};
use oxc_parser::{ParseOptions, Parser};
use oxc_semantic::{AstNode, SemanticBuilder};
use oxc_span::{GetSpan, SourceType, Span};

/// Runs removal passes over `code` until a fixpoint, returning the final
/// source. Errors from intermediate parses are impossible for compiler
/// output; they surface as a panic-free passthrough.
pub(crate) fn remove_unused_variables(code: String, source_type: SourceType) -> String {
    let mut code = code;
    loop {
        let allocator = Allocator::default();
        let parsed = Parser::new(&allocator, &code, source_type)
            .with_options(ParseOptions {
                preserve_parens: false,
                ..ParseOptions::default()
            })
            .parse();
        if !parsed.errors.is_empty() {
            return code;
        }
        let mut program = parsed.program;
        let removals = collect_removals(&program);
        if removals.is_empty() {
            return code;
        }
        let mut remover = Remover { spans: removals };
        remover.visit_program(&mut program);
        code = oxc_codegen::Codegen::new().build(&program).code;
    }
}

/// Spans (of declarator ids / import specifier locals / declaration names)
/// whose bindings have no remaining read references.
fn collect_removals(program: &Program<'_>) -> std::collections::HashSet<Span> {
    let semantic = SemanticBuilder::new().build(program).semantic;
    let scoping = semantic.scoping();

    // Babel treats exports as references (its scope collector calls
    // `binding.reference()` for exported declarations and specifiers), so
    // exported top-level names are never removed.
    let exported = exported_names(program);
    let root_scope = scoping.root_scope_id();

    let mut removals = std::collections::HashSet::new();
    for symbol_id in scoping.symbol_ids() {
        if scoping.symbol_scope_id(symbol_id) == root_scope
            && exported.contains(scoping.symbol_name(symbol_id))
        {
            continue;
        }
        let referenced = scoping
            .get_resolved_reference_ids(symbol_id)
            .iter()
            .any(|reference_id| scoping.get_reference(*reference_id).is_read());
        if referenced {
            continue;
        }
        let node: &AstNode = semantic.symbol_declaration(symbol_id);
        match node.kind() {
            // Destructuring patterns are invalid for removal (Babel's
            // `isInvalidForRemoval`); a plain identifier declarator goes.
            oxc_ast::AstKind::VariableDeclarator(declarator) => {
                if matches!(&declarator.id, BindingPattern::BindingIdentifier(_)) {
                    removals.insert(declarator.span());
                }
            }
            oxc_ast::AstKind::ImportSpecifier(specifier) => {
                removals.insert(specifier.span());
            }
            oxc_ast::AstKind::ImportDefaultSpecifier(specifier) => {
                removals.insert(specifier.span());
            }
            oxc_ast::AstKind::ImportNamespaceSpecifier(specifier) => {
                removals.insert(specifier.span());
            }
            // Function/class declarations (Babel binding kinds `hoisted` /
            // `let`). Params, catch params, and everything else stay.
            oxc_ast::AstKind::Function(function) if function.is_declaration() => {
                removals.insert(function.span());
            }
            oxc_ast::AstKind::Class(class) if class.is_declaration() => {
                removals.insert(class.span());
            }
            _ => {}
        }
    }
    removals
}

fn exported_names(program: &Program<'_>) -> std::collections::HashSet<String> {
    let mut names = std::collections::HashSet::new();
    for statement in &program.body {
        match statement {
            Statement::ExportNamedDeclaration(export) => {
                if export.source.is_some() {
                    continue;
                }
                for specifier in &export.specifiers {
                    if let Some(local) = specifier.local.identifier_name() {
                        names.insert(local.to_string());
                    }
                }
                if let Some(declaration) = &export.declaration {
                    collect_declaration_names(declaration, &mut names);
                }
            }
            Statement::ExportDefaultDeclaration(export) => {
                if let Some(oxc_ast::ast::Expression::Identifier(identifier)) =
                    export.declaration.as_expression()
                {
                    names.insert(identifier.name.to_string());
                }
            }
            _ => {}
        }
    }
    names
}

fn collect_declaration_names(
    declaration: &oxc_ast::ast::Declaration<'_>,
    names: &mut std::collections::HashSet<String>,
) {
    match declaration {
        oxc_ast::ast::Declaration::VariableDeclaration(declaration) => {
            for declarator in &declaration.declarations {
                collect_pattern_names(&declarator.id, names);
            }
        }
        oxc_ast::ast::Declaration::FunctionDeclaration(function) => {
            if let Some(id) = &function.id {
                names.insert(id.name.to_string());
            }
        }
        oxc_ast::ast::Declaration::ClassDeclaration(class) => {
            if let Some(id) = &class.id {
                names.insert(id.name.to_string());
            }
        }
        _ => {}
    }
}

fn collect_pattern_names(
    pattern: &BindingPattern<'_>,
    names: &mut std::collections::HashSet<String>,
) {
    match pattern {
        BindingPattern::BindingIdentifier(id) => {
            names.insert(id.name.to_string());
        }
        BindingPattern::ArrayPattern(array) => {
            for element in array.elements.iter().flatten() {
                collect_pattern_names(element, names);
            }
            if let Some(rest) = &array.rest {
                collect_pattern_names(&rest.argument, names);
            }
        }
        BindingPattern::ObjectPattern(object) => {
            for property in &object.properties {
                collect_pattern_names(&property.value, names);
            }
            if let Some(rest) = &object.rest {
                collect_pattern_names(&rest.argument, names);
            }
        }
        BindingPattern::AssignmentPattern(assignment) => {
            collect_pattern_names(&assignment.left, names);
        }
    }
}

struct Remover {
    spans: std::collections::HashSet<Span>,
}

impl<'a> VisitMut<'a> for Remover {
    fn visit_statements(
        &mut self,
        statements: &mut oxc_allocator::Vec<'a, Statement<'a>>,
    ) {
        statements.retain_mut(|statement| match statement {
            Statement::FunctionDeclaration(function) => !self.spans.contains(&function.span()),
            Statement::ClassDeclaration(class) => !self.spans.contains(&class.span()),
            Statement::VariableDeclaration(declaration) => {
                declaration
                    .declarations
                    .retain(|declarator| !self.spans.contains(&declarator.span()));
                // Babel's `VariableDeclaration` visitor drops emptied
                // declarations.
                !declaration.declarations.is_empty()
            }
            Statement::ImportDeclaration(import) => {
                if let Some(specifiers) = &mut import.specifiers {
                    let had = !specifiers.is_empty();
                    specifiers.retain(|specifier| !self.spans.contains(&specifier.span()));
                    if had && specifiers.is_empty() {
                        return false;
                    }
                }
                true
            }
            _ => true,
        });
        for statement in statements.iter_mut() {
            walk_mut::walk_statement(self, statement);
        }
    }
}
