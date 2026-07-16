use oxc_allocator::Allocator;
use oxc_ast::ast::Expression;
use oxc_span::Span;

use crate::dom::element::AstDomTransform;
use crate::shared::condition::{
    is_condition_shape, memo_wrap_thunk, transform_condition, zero_arg_call_thunk, ConditionBuilder,
};

impl<'a> ConditionBuilder<'a> for AstDomTransform<'a, '_> {
    fn condition_allocator(&self) -> &'a Allocator {
        self.allocator
    }

    fn memo_wrapper_enabled(&self) -> bool {
        self.memo_wrapper.is_some()
    }

    fn register_memo(&mut self) -> String {
        self.template_state.uses_memo = true;
        self.memo_wrapper_local()
    }

    fn next_condition_id(&mut self) -> String {
        AstDomTransform::next_condition_id(self)
    }
}

impl<'a> AstDomTransform<'a, '_> {
    /// Mirror of Babel's `transformNode` for a dynamic native child
    /// expression (`insert()` value). The caller has already applied the
    /// deep-dynamic gate on the original (pre-lowered) expression.
    pub(crate) fn dom_child_expression(
        &mut self,
        span: Span,
        value: Expression<'a>,
    ) -> Expression<'a> {
        if self.wrap_conditionals && is_condition_shape(&value) {
            return transform_condition(self, span, value, false)
                .into_expression(self.allocator, span);
        }
        if let Some(callee) = zero_arg_call_thunk(&value, self.allocator) {
            return callee;
        }
        self.arrow_return_expression(span, value)
    }

    /// Inline `transformCondition(path, true).body` for component props,
    /// component children, and fragment children.
    pub(crate) fn inline_condition_expression(
        &mut self,
        span: Span,
        value: Expression<'a>,
    ) -> Expression<'a> {
        crate::shared::condition::transform_condition_inline(self, span, value)
    }

    /// `createTemplate(wrap: true)` for a dynamic expression: the value's
    /// thunk (the zero-arg callee itself when the expression is already a
    /// bare call, an arrow otherwise) wrapped in `memo` when configured.
    pub(crate) fn memoized_dynamic_expression(
        &mut self,
        span: Span,
        value: Expression<'a>,
    ) -> Expression<'a> {
        let thunk = match zero_arg_call_thunk(&value, self.allocator) {
            Some(callee) => callee,
            None => self.arrow_return_expression(span, value),
        };
        memo_wrap_thunk(self, span, thunk)
    }
}
