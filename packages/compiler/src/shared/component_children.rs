use napi::bindgen_prelude::*;
use oxc_allocator::CloneIn;
use oxc_ast::ast::{Expression, JSXChild, JSXExpression, Statement};
use oxc_span::GetSpan;

use crate::dom::element::AstDomTransform;
use crate::shared::array::expression_to_array_element;
use crate::shared::component::transform_component_expression;
use crate::shared::condition::{is_condition_shape, memo_wrap_thunk};
use crate::shared::utils::{decode_html_entities, is_dynamic_expression_deep, trim_jsx_text};

pub(crate) struct ComponentChildren<'a> {
    pub(crate) value: Expression<'a>,
    pub(crate) needs_getter: bool,
    pub(crate) setup: std::vec::Vec<Statement<'a>>,
}

enum ChildKind {
    /// Text or a non-dynamic expression: never wrapped.
    Static,
    /// A dynamic expression container or spread: memo-wrapped in arrays,
    /// getter-hosted when it is the only child.
    DynamicExpression,
    /// A JSX element or component: dynamic (getter-hosted), but never
    /// memo-wrapped — element setup folds into a per-entry IIFE in arrays.
    Element,
}

struct ChildValue<'a> {
    value: Expression<'a>,
    kind: ChildKind,
    /// Setup statements for native element children (template declarations +
    /// operations). Hoisted into the getter for a single child, folded into a
    /// per-child IIFE inside multi-child arrays — matching Babel, where each
    /// array entry is its own `(() => { ... })()`.
    setup: std::vec::Vec<Statement<'a>>,
}

pub(crate) fn component_children<'a>(
    ctx: &mut AstDomTransform<'a, '_>,
    children: &[JSXChild<'a>],
) -> Result<Option<ComponentChildren<'a>>> {
    let mut values = std::vec::Vec::new();
    for child in children {
        match child {
            JSXChild::Text(text) => {
                let span = text.span;
                let value = decode_html_entities(&trim_jsx_text(&text.value));
                if !value.is_empty() {
                    values.push(ChildValue {
                        value: ctx.ast().expression_string_literal(
                            span,
                            ctx.ast().atom(&value),
                            None,
                        ),
                        kind: ChildKind::Static,
                        setup: std::vec::Vec::new(),
                    });
                }
            }
            JSXChild::ExpressionContainer(container) => {
                if matches!(container.expression, JSXExpression::EmptyExpression(_)) {
                    continue;
                }
                // Babel's `transformNode` gate for component children:
                // `isDynamic(expr, { checkMember: true, checkTags: true })`
                // on the original (pre-lowered) expression.
                let dynamic = container
                    .expression
                    .as_expression()
                    .is_some_and(|expression| is_dynamic_expression_deep(expression, true));
                let mut value = transform_component_expression(ctx, &container.expression);
                if dynamic && ctx.wrap_conditionals && is_condition_shape(&value) {
                    // `transformCondition(..., true)` — memos collapse inline.
                    value = ctx.inline_condition_expression(container.span, value);
                }
                values.push(ChildValue {
                    value,
                    kind: if dynamic {
                        ChildKind::DynamicExpression
                    } else {
                        ChildKind::Static
                    },
                    setup: std::vec::Vec::new(),
                });
            }
            JSXChild::Element(element) => {
                let (value, setup) = ctx.lower_element_with_setup(element)?;
                values.push(ChildValue {
                    value,
                    kind: ChildKind::Element,
                    setup,
                });
            }
            JSXChild::Spread(spread) => {
                let value = spread.expression.clone_in(ctx.allocator);
                let dynamic = is_dynamic_expression_deep(&value, false);
                values.push(ChildValue {
                    value,
                    kind: if dynamic {
                        ChildKind::DynamicExpression
                    } else {
                        ChildKind::Static
                    },
                    setup: std::vec::Vec::new(),
                });
            }
            _ => {
                return Err(Error::from_reason(
                    "Only text and expression component children are implemented in the AST-native milestone",
                ));
            }
        }
    }

    Ok(match values.len() {
        0 => None,
        1 => {
            let child = values.pop().expect("component child exists");
            Some(ComponentChildren {
                value: child.value,
                needs_getter: !matches!(child.kind, ChildKind::Static),
                setup: child.setup,
            })
        }
        _ => {
            let span = children
                .first()
                .map_or_else(|| oxc_span::Span::new(0, 0), JSXChild::span);
            let elements = values
                .into_iter()
                .map(|child| {
                    let span = child.value.span();
                    // Element children keep their setup in a per-entry IIFE;
                    // dynamic expression children are memo-wrapped
                    // (`createTemplate(wrap: true)` with an arrow thunk —
                    // component children never use the bare-callee unwrap).
                    let value = if !child.setup.is_empty() {
                        let mut statements = ctx.ast().vec();
                        statements.extend(child.setup);
                        statements.push(ctx.ast().statement_return(span, Some(child.value)));
                        let iife = ctx.arrow_iife(span, statements);
                        ctx.call_expression(span, iife, std::vec::Vec::new())
                    } else if matches!(child.kind, ChildKind::DynamicExpression) {
                        let thunk = ctx.arrow_return_expression(span, child.value);
                        memo_wrap_thunk(ctx, span, thunk)
                    } else {
                        child.value
                    };
                    expression_to_array_element(value)
                })
                .collect::<std::vec::Vec<_>>();
            Some(ComponentChildren {
                value: ctx
                    .ast()
                    .expression_array(span, ctx.ast().vec_from_iter(elements)),
                needs_getter: true,
                setup: std::vec::Vec::new(),
            })
        }
    })
}
