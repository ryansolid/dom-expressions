//! `lazy()` module-URL pass, ported from the Babel implementation in
//! vite-plugin-solid (`src/lazy-module-url.ts`). Detects
//! `lazy(() => import("specifier"))` calls where `lazy` is a named import
//! from `solid-js` and appends a placeholder string second argument
//! (`"__SOLID_LAZY_MODULE__:<specifier>"`). The placeholder format is a
//! frozen contract: the bundler plugin's `resolveLazyModuleUrls` regex
//! (`"__SOLID_LAZY_MODULE__:([^"]+)"`) rewrites it to a resolved
//! project-relative path afterwards — that half stays in the plugin.

use napi::bindgen_prelude::*;
use napi_derive::napi;
use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Argument, CallExpression, Expression, ImportDeclarationSpecifier, Program, Statement,
};
use oxc_ast::AstBuilder;
use oxc_ast_visit::{walk, walk_mut, Visit, VisitMut};
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_parser::{ParseOptions, Parser};
use oxc_semantic::SemanticBuilder;
use oxc_span::{GetSpan, Span};

use crate::config::{source_type_for_filename, TransformResult};

pub const LAZY_PLACEHOLDER_PREFIX: &str = "__SOLID_LAZY_MODULE__:";

#[napi(object)]
#[derive(Default)]
pub struct TransformLazyOptions {
    /// Mirrors the Babel plugin: without a filename the pass is a no-op
    /// (the placeholder is only useful to a bundler resolving relative to a
    /// module id).
    pub filename: Option<String>,
    pub source_map: Option<bool>,
}

pub fn transform_lazy(
    code: String,
    options: Option<TransformLazyOptions>,
) -> Result<TransformResult> {
    let options = options.unwrap_or_default();
    let Some(filename) = options.filename.as_deref() else {
        return Ok(TransformResult { code, map: None });
    };

    let source_type = source_type_for_filename(Some(filename))?;
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, &code, source_type)
        .with_options(ParseOptions {
            preserve_parens: false,
            ..ParseOptions::default()
        })
        .parse();
    if let Some(error) = parsed.errors.into_iter().next() {
        return Err(Error::from_reason(error.to_string()));
    }

    let mut program = parsed.program;
    let targets = collect_targets(&program);
    if targets.is_empty() {
        // Nothing matched: hand back the input untouched instead of a
        // reprint (the Babel support pass reprints regardless, but callers
        // only care about the placeholder injection).
        return Ok(TransformResult { code, map: None });
    }

    let mut rewriter = Rewriter {
        allocator: &allocator,
        targets,
    };
    rewriter.visit_program(&mut program);

    let build = Codegen::new()
        .with_options(CodegenOptions {
            source_map_path: options
                .source_map
                .unwrap_or(false)
                .then(|| std::path::PathBuf::from(filename)),
            ..CodegenOptions::default()
        })
        .build(&program);

    Ok(TransformResult {
        code: build.code,
        map: build.map.map(|map| map.to_json_string()),
    })
}

/// `(call span, specifier)` for every eligible `lazy(...)` call. Eligibility
/// mirrors the Babel plugin exactly:
/// - callee is the bare identifier `lazy`,
/// - it resolves to a *named* import specifier whose declaration imports
///   from `solid-js` (local shadowing wins; default/namespace imports and
///   aliased locals don't match because the callee must be spelled `lazy`),
/// - exactly one argument: a function/arrow whose body is directly
///   `import("literal")` (or a block whose sole statement returns one).
fn collect_targets(program: &Program<'_>) -> Vec<(Span, String)> {
    let semantic = SemanticBuilder::new().build(program).semantic;
    let scoping = semantic.scoping();

    // Locals bound by `import { ... } from "solid-js"` named specifiers.
    let mut eligible: std::collections::HashSet<oxc_semantic::SymbolId> =
        std::collections::HashSet::new();
    for statement in &program.body {
        let Statement::ImportDeclaration(import) = statement else {
            continue;
        };
        if import.source.value != "solid-js" {
            continue;
        }
        for specifier in import.specifiers.iter().flatten() {
            if let ImportDeclarationSpecifier::ImportSpecifier(specifier) = specifier {
                if let Some(symbol_id) = specifier.local.symbol_id.get() {
                    eligible.insert(symbol_id);
                }
            }
        }
    }
    if eligible.is_empty() {
        return Vec::new();
    }

    struct Collector<'s> {
        scoping: &'s oxc_semantic::Scoping,
        eligible: &'s std::collections::HashSet<oxc_semantic::SymbolId>,
        targets: &'s mut Vec<(Span, String)>,
    }

    impl<'b> Visit<'b> for Collector<'_> {
        fn visit_call_expression(&mut self, call: &CallExpression<'b>) {
            if let Some(specifier) = eligible_specifier(self.scoping, self.eligible, call) {
                self.targets.push((call.span, specifier));
            }
            walk::walk_call_expression(self, call);
        }
    }

    let mut targets = Vec::new();
    let mut collector = Collector {
        scoping,
        eligible: &eligible,
        targets: &mut targets,
    };
    collector.visit_program(program);
    targets
}

fn eligible_specifier(
    scoping: &oxc_semantic::Scoping,
    eligible: &std::collections::HashSet<oxc_semantic::SymbolId>,
    call: &CallExpression<'_>,
) -> Option<String> {
    let Expression::Identifier(callee) = &call.callee else {
        return None;
    };
    if callee.name != "lazy" {
        return None;
    }
    let symbol = callee
        .reference_id
        .get()
        .and_then(|id| scoping.get_reference(id).symbol_id())?;
    if !eligible.contains(&symbol) {
        return None;
    }
    // Babel: bail on 2+ arguments (already annotated) and on 0 arguments.
    if call.arguments.len() != 1 {
        return None;
    }
    let argument = call.arguments[0].as_expression()?;
    extract_dynamic_import_specifier(argument)
}

/// The Babel plugin's `extractDynamicImportSpecifier`: matches
/// `() => import("x")`, `() => { return import("x"); }`, and the
/// `function` equivalents, returning the literal specifier.
fn extract_dynamic_import_specifier(node: &Expression<'_>) -> Option<String> {
    let body = match node {
        Expression::ArrowFunctionExpression(arrow) => &arrow.body,
        Expression::FunctionExpression(function) => function.body.as_ref()?,
        _ => return None,
    };
    let import = match node {
        Expression::ArrowFunctionExpression(arrow) if arrow.expression => {
            match body.statements.first()? {
                Statement::ExpressionStatement(statement) => &statement.expression,
                _ => return None,
            }
        }
        _ => {
            if body.statements.len() != 1 {
                return None;
            }
            match body.statements.first()? {
                Statement::ReturnStatement(statement) => statement.argument.as_ref()?,
                _ => return None,
            }
        }
    };
    let Expression::ImportExpression(import) = import else {
        return None;
    };
    // Babel sees `import(x)` as a call with one argument; `import(x, opts)`
    // has two and is skipped (`options` here), as are phase imports.
    if import.options.is_some() || import.phase.is_some() {
        return None;
    }
    let Expression::StringLiteral(source) = &import.source else {
        return None;
    };
    Some(source.value.to_string())
}

struct Rewriter<'a> {
    allocator: &'a Allocator,
    targets: Vec<(Span, String)>,
}

impl<'a> VisitMut<'a> for Rewriter<'a> {
    fn visit_call_expression(&mut self, call: &mut CallExpression<'a>) {
        if let Some(index) = self
            .targets
            .iter()
            .position(|(span, _)| *span == call.span())
        {
            let (_, specifier) = self.targets.remove(index);
            let ast = AstBuilder::new(self.allocator);
            let value = format!("{LAZY_PLACEHOLDER_PREFIX}{specifier}");
            call.arguments
                .push(Argument::StringLiteral(ast.alloc_string_literal(
                    Span::new(0, 0),
                    ast.atom(&value),
                    None,
                )));
        }
        walk_mut::walk_call_expression(self, call);
    }
}
