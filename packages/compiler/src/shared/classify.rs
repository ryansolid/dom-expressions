//! The single classification authority for traversal-level JSX semantics.
//!
//! Port of the *decision* layer of the Babel plugin's `shared/utils.ts` —
//! most importantly `isDynamic`, which in Babel is one function combining
//! the `/*@static*/` leading-comment check, the namespace-import member
//! carve-out, and the deep dynamic traversal. Every generate (dom, ssr,
//! universal) consults [`Classify`] for these decisions so the modes cannot
//! drift on *what* is dynamic; only emission differs per mode.
//!
//! Nothing outside this module may re-derive dynamic classification: the deep
//! traversal helpers are private here by design.

use oxc_ast::ast::BinaryOperator;
use oxc_ast::ast::{Expression, JSXChild};
use oxc_span::GetSpan;

use crate::shared::bindings::BindingTable;

/// Borrowed view over the state Babel's `isDynamic` reads through
/// `path.scope` / `getConfig(path)`: the binding table (namespace imports),
/// the raw source (comment trivia), and the configured static marker.
pub(crate) struct Classify<'c> {
    bindings: &'c BindingTable,
    source: &'c str,
    static_marker: &'c str,
}

impl<'c> Classify<'c> {
    pub(crate) fn new(bindings: &'c BindingTable, source: &'c str, static_marker: &'c str) -> Self {
        Self {
            bindings,
            source,
            static_marker,
        }
    }

    /// Whether the configured static marker comment appears between two
    /// source offsets (e.g. between an expression container's `{` and the
    /// expression itself — Babel's `leadingComments[0]` check).
    pub(crate) fn marker_between(&self, start: u32, end: u32) -> bool {
        let start = start as usize;
        let end = (end as usize).min(self.source.len());
        if start >= end {
            return false;
        }
        self.source[start..end].contains(self.static_marker)
    }

    /// Full port of Babel's `isDynamic(path, { checkMember: true, checkTags })`:
    /// the static-marker leading-comment check, the namespace-import member
    /// carve-out, and the deep traversal, in one place.
    ///
    /// `leading_from` is the source offset where the expression's leading
    /// trivia begins (the `{` of its expression container, the previous
    /// token of a condition branch). `None` skips the marker check for call
    /// sites whose Babel counterpart never sees a leading comment there
    /// (spread children, where the marker precedes `...` and attaches to the
    /// spread node instead of the expression).
    pub(crate) fn is_dynamic(
        &self,
        leading_from: Option<u32>,
        expression: &Expression<'_>,
        check_tags: bool,
    ) -> bool {
        if let Some(from) = leading_from {
            if self.marker_between(from, expression.span().start) {
                return false;
            }
        }
        is_dynamic_with_namespaces(expression, check_tags, self.bindings)
    }

    /// Mirror of the Babel plugin's `dynamic` marking for child holes
    /// (`transformNode`'s `isDynamic` on containers and spread children):
    /// decides the hydration `scope()` wrap together with
    /// `child_slot_allocates_ids`. Shared so the dom and ssr generates
    /// classify the same source identically.
    pub(crate) fn is_dynamic_child_slot(&self, child: &JSXChild<'_>) -> bool {
        match child {
            JSXChild::ExpressionContainer(container) => {
                container.expression.as_expression().is_some_and(|expression| {
                    self.is_dynamic(Some(container.span.start), expression, false)
                })
            }
            JSXChild::Spread(spread) => self.is_dynamic(None, &spread.expression, false),
            _ => false,
        }
    }
}

/// Babel's `filterChildren` text rule: raw JSX text starting with a newline
/// and containing only whitespace is dropped before children counting and
/// child-list filtering.
pub(crate) fn jsx_text_is_filtered(raw: &str) -> bool {
    matches!(raw.chars().next(), Some('\r' | '\n')) && raw.chars().all(char::is_whitespace)
}

/// Babel's `filterChildren` + `checkLength` composition: counts the children
/// that render content — text that survives the filter and has non-whitespace
/// content or is a pure-space run, non-empty expression containers, elements,
/// fragments, and spreads.
pub(crate) fn significant_children(children: &[JSXChild<'_>]) -> usize {
    children
        .iter()
        .filter(|child| match child {
            JSXChild::Text(text) => {
                let raw = text.value.as_str();
                if jsx_text_is_filtered(raw) {
                    return false;
                }
                raw.chars().any(|char| !char.is_whitespace()) || raw.chars().all(|char| char == ' ')
            }
            JSXChild::ExpressionContainer(container) => !matches!(
                container.expression,
                oxc_ast::ast::JSXExpression::EmptyExpression(_)
            ),
            _ => true,
        })
        .count()
}

/// Babel's `checkLength`: more than one significant child.
pub(crate) fn check_length(children: &[JSXChild<'_>]) -> bool {
    significant_children(children) > 1
}

/// Babel's `isDynamic` namespace carve-out: a member expression whose object
/// is an `import * as ns` local is not dynamic (top-level expression only —
/// nested occurrences inside a larger expression still count as dynamic,
/// matching Babel's pre-traversal check).
fn is_dynamic_with_namespaces(
    value: &Expression<'_>,
    check_tags: bool,
    bindings: &BindingTable,
) -> bool {
    match value {
        Expression::StaticMemberExpression(member) => {
            if let Expression::Identifier(object) = &member.object {
                if bindings.is_namespace_import(&object.name) {
                    return false;
                }
            }
        }
        Expression::ComputedMemberExpression(member) => {
            if let Expression::Identifier(object) = &member.object {
                if bindings.is_namespace_import(&object.name)
                    && !is_dynamic_deep(&member.expression, check_tags)
                {
                    return false;
                }
            }
        }
        _ => {}
    }
    is_dynamic_deep(value, check_tags)
}

/// Deep port of the Babel plugin's `isDynamic(expr, { checkMember: true,
/// checkTags })` traversal: walks the whole expression (skipping function
/// bodies — functions themselves are never dynamic) and reports any call,
/// tagged template, member access, spread, or `in` binary expression. With
/// `check_tags`, JSX elements and non-empty JSX fragments count as dynamic;
/// without it their subtrees are skipped entirely, exactly like Babel's
/// `p.skip()`.
fn is_dynamic_deep(value: &Expression<'_>, check_tags: bool) -> bool {
    use oxc_ast_visit::Visit;

    if matches!(
        value,
        Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_)
    ) {
        return false;
    }

    struct DynamicDetector {
        dynamic: bool,
        check_tags: bool,
    }

    impl<'b> Visit<'b> for DynamicDetector {
        fn visit_call_expression(&mut self, _it: &oxc_ast::ast::CallExpression<'b>) {
            self.dynamic = true;
        }
        fn visit_tagged_template_expression(
            &mut self,
            _it: &oxc_ast::ast::TaggedTemplateExpression<'b>,
        ) {
            self.dynamic = true;
        }
        fn visit_static_member_expression(
            &mut self,
            _it: &oxc_ast::ast::StaticMemberExpression<'b>,
        ) {
            self.dynamic = true;
        }
        fn visit_computed_member_expression(
            &mut self,
            _it: &oxc_ast::ast::ComputedMemberExpression<'b>,
        ) {
            self.dynamic = true;
        }
        fn visit_private_field_expression(
            &mut self,
            _it: &oxc_ast::ast::PrivateFieldExpression<'b>,
        ) {
            self.dynamic = true;
        }
        fn visit_spread_element(&mut self, _it: &oxc_ast::ast::SpreadElement<'b>) {
            self.dynamic = true;
        }
        fn visit_binary_expression(&mut self, it: &oxc_ast::ast::BinaryExpression<'b>) {
            if it.operator == BinaryOperator::In {
                self.dynamic = true;
                return;
            }
            oxc_ast_visit::walk::walk_binary_expression(self, it);
        }
        fn visit_jsx_element(&mut self, _it: &oxc_ast::ast::JSXElement<'b>) {
            if self.check_tags {
                self.dynamic = true;
            }
        }
        fn visit_jsx_fragment(&mut self, it: &oxc_ast::ast::JSXFragment<'b>) {
            if self.check_tags && !it.children.is_empty() {
                self.dynamic = true;
            }
        }
        fn visit_function(
            &mut self,
            _it: &oxc_ast::ast::Function<'b>,
            _flags: oxc_syntax::scope::ScopeFlags,
        ) {
        }
        fn visit_arrow_function_expression(
            &mut self,
            _it: &oxc_ast::ast::ArrowFunctionExpression<'b>,
        ) {
        }
    }

    let mut detector = DynamicDetector {
        dynamic: false,
        check_tags,
    };
    // Babel's `path.traverse` starts below the root: a JSX element in root
    // position has its own attributes and children scanned (nested elements
    // still skip) even when tags themselves don't count. With `checkTags` the
    // root check fires first, as in Babel.
    match value {
        Expression::JSXElement(element) => {
            if check_tags {
                return true;
            }
            oxc_ast_visit::walk::walk_jsx_element(&mut detector, element);
        }
        Expression::JSXFragment(fragment) => {
            if check_tags && !fragment.children.is_empty() {
                return true;
            }
            oxc_ast_visit::walk::walk_jsx_fragment(&mut detector, fragment);
        }
        _ => detector.visit_expression(value),
    }
    detector.dynamic
}
