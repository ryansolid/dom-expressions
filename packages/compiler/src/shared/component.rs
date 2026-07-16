use napi::bindgen_prelude::*;
use oxc_ast::{
    ast::{Expression, JSXAttributeItem, JSXAttributeValue, JSXElement, JSXExpression, Statement},
    AstBuilder,
};
use oxc_span::{GetSpan, Span};

use crate::dom::element::jsx_expression_to_expression;
use crate::dom::element::AstDomTransform;
use crate::shared::component_callee::{component_callee_expression, ComponentCalleeContext};
use crate::shared::component_children::component_children;
use crate::shared::component_props::{
    component_property, component_props_expression, component_spread_expression,
    flush_component_props,
};
use crate::shared::refs::component_ref_property;
use crate::shared::utils::{decode_html_entities, is_dynamic_expression_deep};

pub(crate) fn lower_component_with_setup<'a>(
    ctx: &mut AstDomTransform<'a, '_>,
    element: &JSXElement<'a>,
) -> Result<(Expression<'a>, std::vec::Vec<Statement<'a>>)> {
    ctx.template_state.uses_create_component = true;
    let root_tag = ctx.jsx_root_span == Some(element.span);
    let component = component_callee_expression(ctx, &element.opening_element.name, root_tag)?;
    let mut prop_objects = std::vec::Vec::new();
    let mut running_props = std::vec::Vec::new();
    let mut force_merge_props = false;
    let mut setup = std::vec::Vec::new();

    for attr in &element.opening_element.attributes {
        let attr = match attr {
            JSXAttributeItem::Attribute(attr) => attr,
            JSXAttributeItem::SpreadAttribute(spread) => {
                flush_component_props(ctx, &mut running_props, &mut prop_objects, element.span);
                let spread = component_spread_expression(ctx, &spread.argument, spread.span);
                force_merge_props = force_merge_props || spread.force_merge;
                prop_objects.push(spread.value);
                continue;
            }
        };
        // Namespaced attributes pass through as literal `ns:name` prop keys
        // (Babel's `convertJSXIdentifier` string form).
        let name = match &attr.name {
            oxc_ast::ast::JSXAttributeName::Identifier(name) => name.name.to_string(),
            oxc_ast::ast::JSXAttributeName::NamespacedName(name) => {
                format!("{}:{}", name.namespace.name, name.name.name)
            }
        };
        let (value, needs_getter, condition_inlined) = match &attr.value {
            None => (
                ctx.ast().expression_boolean_literal(attr.span, true),
                false,
                false,
            ),
            Some(JSXAttributeValue::StringLiteral(value)) => {
                let span = value.span;
                let value = decode_html_entities(&value.value);
                (
                    ctx.ast()
                        .expression_string_literal(span, ctx.ast().atom(&value), None),
                    false,
                    false,
                )
            }
            Some(JSXAttributeValue::ExpressionContainer(container)) => {
                let dynamic = component_prop_is_dynamic(ctx, &name, container);
                let mut value = transform_component_expression(ctx, &container.expression);
                // Dynamic conditional/logical props collapse their memos
                // inline within the getter, mirroring Babel's
                // `transformCondition(..., true)`.
                let mut condition_inlined = false;
                if dynamic
                    && ctx.wrap_conditionals
                    && crate::shared::condition::is_condition_shape(&value)
                {
                    let span = value.span();
                    value = ctx.inline_condition_expression(span, value);
                    condition_inlined = true;
                }
                (value, dynamic, condition_inlined)
            }
            _ => {
                return Err(Error::from_reason(
                    "Component JSX attribute values are not implemented in the AST-native milestone yet",
                ));
            }
        };
        if name == "ref" {
            if let Some(ref_property) = component_ref_property(ctx, attr.span, value, &mut setup) {
                running_props.push(ref_property);
            }
        } else if needs_getter && !condition_inlined {
            // Babel inlines a zero-arg arrow IIFE value's body straight into
            // the getter (`when={(() => {...})()}` → `get when() {...}`).
            match crate::shared::ast::zero_arg_iife_statements(ctx.allocator, attr.span, value) {
                Ok(statements) => {
                    running_props.push(crate::shared::ast::object_getter_property_with_statements(
                        ctx.allocator,
                        attr.span,
                        &name,
                        statements,
                    ));
                }
                Err(value) => {
                    running_props.push(component_property(ctx, attr.span, &name, value, true));
                }
            }
        } else {
            running_props.push(component_property(
                ctx,
                attr.span,
                &name,
                value,
                needs_getter,
            ));
        }
    }

    let children = component_children(ctx, &element.children)?;
    if let Some(children) = children {
        if children.needs_getter {
            running_props.push(ctx.object_getter_property_with_setup(
                element.span,
                "children",
                children.setup,
                children.value,
            ));
        } else {
            running_props.push(ctx.object_property(element.span, "children", children.value));
        }
    }

    flush_component_props(ctx, &mut running_props, &mut prop_objects, element.span);
    let props = component_props_expression(ctx, element.span, prop_objects, force_merge_props);
    Ok((
        ctx.call_identifier(element.span, "_$createComponent", vec![component, props]),
        setup,
    ))
}

/// Babel gates component-prop getters on
/// `isDynamic(value, { checkMember: true, checkTags: true })` — a deep
/// traversal of the original (pre-lowered) expression.
fn component_prop_is_dynamic(
    ctx: &AstDomTransform<'_, '_>,
    name: &str,
    container: &oxc_ast::ast::JSXExpressionContainer<'_>,
) -> bool {
    if name == "ref" {
        return false;
    }
    if crate::shared::utils::source_from_span(container.span, ctx.source)
        .contains(&ctx.static_marker)
    {
        return false;
    }
    container
        .expression
        .as_expression()
        .is_some_and(|expression| is_dynamic_expression_deep(expression, true))
}

pub(crate) fn transform_component_expression<'a>(
    ctx: &mut AstDomTransform<'a, '_>,
    expression: &JSXExpression<'a>,
) -> Expression<'a> {
    // JSX inside the value stays raw: Babel builds prop getters around the
    // untransformed expression and its outer traversal lowers the JSX later
    // (statement-position inlining, container-end template registration).
    // `this` was already rewritten by the root-level `transformThis` pass.
    jsx_expression_to_expression(expression, ctx.allocator)
}

impl<'a> ComponentCalleeContext<'a> for AstDomTransform<'a, '_> {
    fn ast(&self) -> AstBuilder<'a> {
        self.ast()
    }

    fn is_built_in(&self, name: &str) -> bool {
        self.built_ins.iter().any(|built_in| built_in == name)
    }

    fn is_builtin_shadowed(&self, span: Span) -> bool {
        self.bindings.is_builtin_shadowed(span)
    }

    fn register_built_in(&mut self, name: &str) {
        if !self
            .template_state
            .built_in_imports
            .iter()
            .any(|built_in| built_in == name)
        {
            self.template_state.built_in_imports.push(name.to_string());
        }
    }

    fn capture_this_callee(&mut self, span: Span) -> Result<Expression<'a>> {
        Ok(self.capture_this_expression(span))
    }
}
