use napi::bindgen_prelude::*;
use oxc_ast::ast::{Expression, JSXChild, JSXExpression, JSXFragment};
use oxc_span::{GetSpan, Span};

use crate::dom::element::AstDomTransform;
use crate::shared::array::expression_to_array_element;
use crate::shared::component::transform_component_expression;
use crate::shared::condition::{is_condition_shape, memo_wrap_thunk};
use crate::shared::utils::{decode_html_entities, is_dynamic_expression_deep, trim_jsx_text};

pub(crate) fn lower_fragment<'a>(
    ctx: &mut AstDomTransform<'a, '_>,
    fragment: &JSXFragment<'a>,
) -> Result<Expression<'a>> {
    let mut values = std::vec::Vec::new();
    for child in &fragment.children {
        match child {
            JSXChild::Text(text) => {
                let value = decode_html_entities(&trim_jsx_text(&text.value));
                if !value.is_empty() {
                    values.push(ctx.ast().expression_string_literal(
                        text.span,
                        ctx.ast().atom(&value),
                        None,
                    ));
                }
            }
            JSXChild::ExpressionContainer(container) => {
                if !matches!(container.expression, JSXExpression::EmptyExpression(_)) {
                    // Babel gates fragment-child wrapping on a deep
                    // `isDynamic(expr, { checkMember: true })` of the original
                    // (pre-lowered) expression — JSX tags don't count in
                    // native fragment position.
                    let dynamic = container
                        .expression
                        .as_expression()
                        .is_some_and(|expression| is_dynamic_expression_deep(expression, false));
                    let mut value = transform_component_expression(ctx, &container.expression);
                    if !dynamic {
                        values.push(value);
                    } else {
                        // Dynamic conditionals collapse their memos inline
                        // first (`transformCondition(..., true)`), then
                        // `createTemplate(wrap: true)` memo-wraps the thunk.
                        if ctx.wrap_conditionals && is_condition_shape(&value) {
                            value = ctx.inline_condition_expression(container.span, value);
                            value = ctx.arrow_return_expression(container.span, value);
                            values.push(memo_wrap_thunk(ctx, container.span, value));
                        } else {
                            values.push(ctx.memoized_dynamic_expression(container.span, value));
                        }
                    }
                }
            }
            JSXChild::Element(element) => {
                values.push(ctx.lower_element(element)?);
            }
            JSXChild::Fragment(fragment) => {
                values.push(lower_fragment(ctx, fragment)?);
            }
            JSXChild::Spread(_) => {
                return Err(Error::from_reason(
                    "Fragment spread children are not implemented in the AST-native milestone yet",
                ));
            }
        }
    }

    Ok(match values.len() {
        0 => ctx.ast().expression_array(fragment.span, ctx.ast().vec()),
        1 => values.pop().expect("fragment value exists"),
        _ => ctx.ast().expression_array(
            fragment
                .children
                .first()
                .map_or_else(|| Span::new(0, 0), JSXChild::span),
            ctx.ast()
                .vec_from_iter(values.into_iter().map(expression_to_array_element)),
        ),
    })
}
