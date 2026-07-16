//! Port of the Babel implementation's `removeUnusedVariables`: after
//! function-level directive extraction the client build replaces function
//! bodies with references, so anything only those bodies used — including
//! now-unneeded imports — must go. That is the server-code-leak guarantee.
//!
//! The shake is scoped to "orphan candidates": the names referenced from the
//! replaced subtrees, expanded transitively with the names referenced by each
//! declaration the shake removes. Bindings that were already unreferenced
//! before the transform are not candidates and survive untouched.
//!
//! Babel repeats scope-crawl + removal passes until a pass removes nothing.
//! This port does the same but re-parses the printed output between passes so
//! `oxc_semantic`'s reference counts stay exact against fresh spans. As a
//! consequence the pass operates code-to-code rather than on the live AST;
//! candidates are tracked by name, which survives reprints.

use oxc_allocator::Allocator;
use oxc_ast::ast::{BindingPattern, Expression, Program, Statement};
use oxc_ast_visit::{walk, walk_mut, Visit, VisitMut};
use oxc_parser::{ParseOptions, Parser};
use oxc_semantic::{AstNode, Scoping, SemanticBuilder};
use oxc_span::{GetSpan, SourceType, Span};

/// Mirrors the Babel implementation's message verbatim (it warns through
/// `console.warn`; this side uses stderr like the template validator).
const DIRECT_EVAL_WARNING: &str = "server-functions: skipping dead-code elimination for this module because it contains a direct eval() call";

/// Runs removal passes over `code` until a fixpoint, returning the final
/// source. Only bindings named in `orphans` (plus cascades) are eligible.
/// Errors from intermediate parses are impossible for compiler output; they
/// surface as a panic-free passthrough.
pub(crate) fn remove_unused_variables(
    code: String,
    source_type: SourceType,
    orphans: std::collections::HashSet<String>,
    dev: bool,
) -> String {
    let mut candidates = orphans;
    if candidates.is_empty() {
        return code;
    }
    {
        // A direct `eval(...)` call (identifier callee that resolves to
        // nothing local) can read any binding in scope, so reference counts
        // are unreliable: skip the shake entirely.
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
        let semantic = SemanticBuilder::new().build(&parsed.program).semantic;
        if has_direct_eval(&parsed.program, semantic.scoping()) {
            if dev {
                eprintln!("{DIRECT_EVAL_WARNING}");
            }
            return code;
        }
    }

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
        let removals = collect_removals(&program, &candidates);
        if removals.spans.is_empty() && removals.pattern_ids.is_empty() {
            return code;
        }
        let mut remover = Remover {
            spans: removals.spans,
            pattern_ids: removals.pattern_ids,
            candidates: &mut candidates,
        };
        remover.visit_program(&mut program);
        code = oxc_codegen::Codegen::new().build(&program).code;
    }
}

fn has_direct_eval(program: &Program<'_>, scoping: &Scoping) -> bool {
    struct DirectEvalDetector<'s> {
        scoping: &'s Scoping,
        found: bool,
    }

    impl<'b> Visit<'b> for DirectEvalDetector<'_> {
        fn visit_call_expression(&mut self, call: &oxc_ast::ast::CallExpression<'b>) {
            if let Expression::Identifier(identifier) = &call.callee {
                if identifier.name == "eval" {
                    let shadowed = identifier
                        .reference_id
                        .get()
                        .is_some_and(|id| self.scoping.get_reference(id).symbol_id().is_some());
                    if !shadowed {
                        self.found = true;
                        return;
                    }
                }
            }
            walk::walk_call_expression(self, call);
        }
    }

    let mut detector = DirectEvalDetector {
        scoping,
        found: false,
    };
    detector.visit_program(program);
    detector.found
}

/// Names in reference positions within a removed subtree — the cascade seed
/// (Babel's `collectReferencedNames`).
struct ReferencedNames<'t> {
    names: &'t mut std::collections::HashSet<String>,
}

impl<'b> Visit<'b> for ReferencedNames<'_> {
    fn visit_identifier_reference(&mut self, it: &oxc_ast::ast::IdentifierReference<'b>) {
        self.names.insert(it.name.to_string());
    }
}

struct Removals {
    /// Spans of whole nodes to remove: declarators with identifier ids,
    /// import specifier locals, function/class declarations.
    spans: std::collections::HashSet<Span>,
    /// Spans of binding identifiers inside destructuring patterns, removed
    /// element-by-element (with cascade) rather than as whole declarators.
    pattern_ids: std::collections::HashSet<Span>,
}

/// Bindings with no remaining read references, restricted to the
/// orphan-candidate set.
fn collect_removals(
    program: &Program<'_>,
    candidates: &std::collections::HashSet<String>,
) -> Removals {
    let semantic = SemanticBuilder::new().build(program).semantic;
    let scoping = semantic.scoping();

    // Babel treats exports as references (its scope collector calls
    // `binding.reference()` for exported declarations and specifiers), so
    // exported top-level names are never removed.
    let exported = exported_names(program);
    let root_scope = scoping.root_scope_id();

    let mut removals = Removals {
        spans: std::collections::HashSet::new(),
        pattern_ids: std::collections::HashSet::new(),
    };
    for symbol_id in scoping.symbol_ids() {
        let name = scoping.symbol_name(symbol_id);
        // Only bindings orphaned by the rewrite (or by a prior removal) are
        // eligible; pre-existing dead code survives the transform.
        if !candidates.contains(name) {
            continue;
        }
        if scoping.symbol_scope_id(symbol_id) == root_scope && exported.contains(name) {
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
            oxc_ast::AstKind::VariableDeclarator(declarator) => {
                if matches!(&declarator.id, BindingPattern::BindingIdentifier(_)) {
                    removals.spans.insert(declarator.span());
                } else {
                    // Destructured binding: remove just this element (the
                    // symbol span is the binding identifier's span).
                    removals.pattern_ids.insert(scoping.symbol_span(symbol_id));
                }
            }
            oxc_ast::AstKind::ImportSpecifier(specifier) => {
                removals.spans.insert(specifier.span());
            }
            oxc_ast::AstKind::ImportDefaultSpecifier(specifier) => {
                removals.spans.insert(specifier.span());
            }
            oxc_ast::AstKind::ImportNamespaceSpecifier(specifier) => {
                removals.spans.insert(specifier.span());
            }
            // Function/class declarations (Babel binding kinds `hoisted` /
            // `let`). Params, catch params, and everything else stay.
            oxc_ast::AstKind::Function(function) if function.is_declaration() => {
                removals.spans.insert(function.span());
            }
            oxc_ast::AstKind::Class(class) if class.is_declaration() => {
                removals.spans.insert(class.span());
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

struct Remover<'c> {
    spans: std::collections::HashSet<Span>,
    pattern_ids: std::collections::HashSet<Span>,
    /// Removed declarations cascade: names their subtrees referenced become
    /// candidates for the next fixpoint pass.
    candidates: &'c mut std::collections::HashSet<String>,
}

impl Remover<'_> {
    fn collector(&mut self) -> ReferencedNames<'_> {
        ReferencedNames {
            names: &mut *self.candidates,
        }
    }

    /// Prunes removed binding identifiers out of a pattern. Returns true when
    /// the pattern has no bindings left and should be removed by its parent
    /// (defaults and computed keys go with their element; the caller collects
    /// references from whatever it removes).
    fn prune_pattern<'a>(&mut self, pattern: &mut BindingPattern<'a>) -> bool {
        match pattern {
            BindingPattern::BindingIdentifier(id) => self.pattern_ids.contains(&id.span),
            BindingPattern::AssignmentPattern(assignment) => {
                if self.prune_pattern(&mut assignment.left) {
                    self.collector().visit_expression(&assignment.right);
                    true
                } else {
                    false
                }
            }
            BindingPattern::ObjectPattern(object) => {
                let mut index = 0;
                while index < object.properties.len() {
                    if self.prune_pattern(&mut object.properties[index].value) {
                        let removed = object.properties.remove(index);
                        self.collector().visit_binding_property(&removed);
                    } else {
                        index += 1;
                    }
                }
                if let Some(rest) = &mut object.rest {
                    if self.prune_pattern(&mut rest.argument) {
                        object.rest = None;
                    }
                }
                object.properties.is_empty() && object.rest.is_none()
            }
            BindingPattern::ArrayPattern(array) => {
                for element in array.elements.iter_mut() {
                    if let Some(pattern) = element {
                        if self.prune_pattern(pattern) {
                            let removed = element.take().expect("checked Some above");
                            self.collector().visit_binding_pattern(&removed);
                        }
                    }
                }
                if let Some(rest) = &mut array.rest {
                    if self.prune_pattern(&mut rest.argument) {
                        array.rest = None;
                    }
                }
                // A removed element leaves a hole when later elements remain;
                // trailing holes truncate.
                while matches!(array.elements.last(), Some(None)) {
                    array.elements.pop();
                }
                array.elements.is_empty() && array.rest.is_none()
            }
        }
    }
}

impl<'a> VisitMut<'a> for Remover<'_> {
    fn visit_statements(&mut self, statements: &mut oxc_allocator::Vec<'a, Statement<'a>>) {
        let mut index = 0;
        while index < statements.len() {
            let keep = match &mut statements[index] {
                Statement::FunctionDeclaration(function) => {
                    if self.spans.contains(&function.span()) {
                        self.collector()
                            .visit_function(function, oxc_syntax::scope::ScopeFlags::Function);
                        false
                    } else {
                        true
                    }
                }
                Statement::ClassDeclaration(class) => {
                    if self.spans.contains(&class.span()) {
                        self.collector().visit_class(class);
                        false
                    } else {
                        true
                    }
                }
                Statement::VariableDeclaration(declaration) => {
                    let mut declarator_index = 0;
                    while declarator_index < declaration.declarations.len() {
                        let declarator = &mut declaration.declarations[declarator_index];
                        let remove = self.spans.contains(&declarator.span())
                            || (!matches!(declarator.id, BindingPattern::BindingIdentifier(_))
                                && self.prune_pattern(&mut declarator.id));
                        if remove {
                            // The initializer is orphaned with its declarator
                            // (aggressive-removal semantics), so its
                            // references cascade.
                            let removed = declaration.declarations.remove(declarator_index);
                            self.collector().visit_variable_declarator(&removed);
                        } else {
                            declarator_index += 1;
                        }
                    }
                    // Babel's `VariableDeclaration` visitor drops emptied
                    // declarations.
                    !declaration.declarations.is_empty()
                }
                Statement::ImportDeclaration(import) => {
                    if let Some(specifiers) = &mut import.specifiers {
                        let had = !specifiers.is_empty();
                        specifiers.retain(|specifier| !self.spans.contains(&specifier.span()));
                        !(had && specifiers.is_empty())
                    } else {
                        true
                    }
                }
                _ => true,
            };
            if keep {
                index += 1;
            } else {
                statements.remove(index);
            }
        }
        for statement in statements.iter_mut() {
            walk_mut::walk_statement(self, statement);
        }
    }
}
