use std::collections::{BTreeMap, BTreeSet, HashSet};

use oxc_ast::ast::{
    JSXAttributeItem, JSXAttributeName, JSXAttributeValue, JSXChild, JSXElement, JSXExpression,
    JSXFragment, Program,
};
use oxc_ast_visit::Visit;
use oxc_span::{GetSpan, Span};

use crate::shared::attr_plan::static_style_key;
use crate::shared::bindings::BindingTable;
use crate::shared::utils::{dedupe_attributes, is_component_name, is_literal_only_expression};

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub struct SourceSpan {
    pub start: u32,
    pub end: u32,
}

impl From<Span> for SourceSpan {
    fn from(span: Span) -> Self {
        Self {
            start: span.start,
            end: span.end,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum ExecutionSiteKind {
    JsxChild,
    NativeAttribute,
    NativeSpread,
    ComponentProperty,
    ComponentSpread,
    ComponentChild,
    EventHandler,
    Ref,
    ControlFlowRender,
}

impl ExecutionSiteKind {
    fn is_value(self) -> bool {
        matches!(
            self,
            Self::JsxChild
                | Self::NativeAttribute
                | Self::NativeSpread
                | Self::ComponentProperty
                | Self::ComponentSpread
                | Self::ComponentChild
        )
    }
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum ValueDecision {
    EagerOnce,
    ReactiveRerun,
    CallerContext,
    Elided,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum CallbackDecision {
    LaterEvent,
    LaterRender,
    RefApply,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum TerminalDecision {
    Value(ValueDecision),
    Callback(CallbackDecision),
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub struct ExecutionSite {
    pub span: SourceSpan,
    pub kind: ExecutionSiteKind,
    pub decision: TerminalDecision,
}

/// Experimental facts about how JSX source values and callbacks are lowered
/// and executed in DOM mode.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct SemanticTrace {
    pub sites: Vec<ExecutionSite>,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
struct SiteKey {
    span: SourceSpan,
    kind: ExecutionSiteKind,
}

pub(crate) struct ExecutionCensus {
    sites: BTreeSet<SiteKey>,
    ignored_literal_spans: BTreeSet<SourceSpan>,
}

impl ExecutionCensus {
    pub(crate) fn from_program(
        program: &Program<'_>,
        built_ins: &[String],
        inline_styles: bool,
    ) -> Self {
        let mut bindings = BindingTable::default();
        bindings.scan_builtin_shadowing(program, built_ins);

        struct CensusVisitor<'a, 'bindings> {
            sites: BTreeSet<SiteKey>,
            ignored_literal_spans: BTreeSet<SourceSpan>,
            component_child_fragments: BTreeSet<SourceSpan>,
            built_ins: HashSet<&'a str>,
            bindings: &'bindings BindingTable,
            inline_styles: bool,
        }

        impl CensusVisitor<'_, '_> {
            fn push(&mut self, span: Span, kind: ExecutionSiteKind) {
                if span.start < span.end {
                    self.sites.insert(SiteKey {
                        span: span.into(),
                        kind,
                    });
                }
            }

            fn ignore_literal(&mut self, span: Span) {
                if span.start < span.end {
                    self.ignored_literal_spans.insert(span.into());
                }
            }

            fn attribute_name(name: &JSXAttributeName<'_>) -> String {
                match name {
                    JSXAttributeName::Identifier(name) => name.name.to_string(),
                    JSXAttributeName::NamespacedName(name) => {
                        format!("{}:{}", name.namespace.name, name.name.name)
                    }
                }
            }

            fn native_tag_name<'node, 'ast>(
                element: &'node JSXElement<'ast>,
            ) -> Option<&'node str> {
                match &element.opening_element.name {
                    oxc_ast::ast::JSXElementName::Identifier(name) => Some(name.name.as_str()),
                    oxc_ast::ast::JSXElementName::IdentifierReference(name) => {
                        Some(name.name.as_str())
                    }
                    _ => None,
                }
            }

            fn class_object_splits(object: &oxc_ast::ast::ObjectExpression<'_>) -> bool {
                object.properties.iter().all(|property| match property {
                    oxc_ast::ast::ObjectPropertyKind::SpreadProperty(_) => false,
                    oxc_ast::ast::ObjectPropertyKind::ObjectProperty(property) => {
                        if property.computed {
                            return false;
                        }
                        match &property.key {
                            oxc_ast::ast::PropertyKey::StringLiteral(key) => {
                                !key.value.contains(' ') && !key.value.contains(':')
                            }
                            _ => true,
                        }
                    }
                })
            }

            fn split_class_array_object<'node, 'ast>(
                expression: &'node oxc_ast::ast::Expression<'ast>,
            ) -> Option<&'node oxc_ast::ast::ObjectExpression<'ast>> {
                let oxc_ast::ast::Expression::ArrayExpression(array) = expression else {
                    return None;
                };
                let mut static_classes = Vec::new();
                let mut cursor = 0;
                while let Some(oxc_ast::ast::ArrayExpressionElement::StringLiteral(value)) =
                    array.elements.get(cursor)
                {
                    static_classes.push(value.value.to_string());
                    cursor += 1;
                }
                if static_classes.is_empty() || cursor != array.elements.len().checked_sub(1)? {
                    return None;
                }
                let Some(oxc_ast::ast::ArrayExpressionElement::ObjectExpression(object)) =
                    array.elements.get(cursor)
                else {
                    return None;
                };
                let static_class_set: HashSet<String> = static_classes
                    .iter()
                    .flat_map(|class| class.split_whitespace().map(str::to_string))
                    .collect();
                let conflicting = object.properties.iter().any(|property| match property {
                    oxc_ast::ast::ObjectPropertyKind::SpreadProperty(_) => true,
                    oxc_ast::ast::ObjectPropertyKind::ObjectProperty(property) => {
                        if property.computed {
                            return true;
                        }
                        static_style_key(&property.key).is_none_or(|key| {
                            key.contains(' ')
                                || key.contains(':')
                                || static_class_set.contains(&key)
                        })
                    }
                });
                (!conflicting).then_some(object)
            }

            fn mark_component_child_fragments(&mut self, children: &[JSXChild<'_>]) {
                for child in children {
                    if let JSXChild::Fragment(fragment) = child {
                        self.component_child_fragments.insert(fragment.span.into());
                    }
                }
            }

            fn census_children(&mut self, children: &[JSXChild<'_>], component: bool) {
                for child in children {
                    match child {
                        JSXChild::ExpressionContainer(container)
                            if !matches!(
                                container.expression,
                                JSXExpression::EmptyExpression(_)
                            ) =>
                        {
                            if container
                                .expression
                                .as_expression()
                                .is_some_and(is_literal_only_expression)
                            {
                                self.ignore_literal(container.expression.span());
                                continue;
                            }
                            self.push(
                                container.expression.span(),
                                if component {
                                    ExecutionSiteKind::ComponentChild
                                } else {
                                    ExecutionSiteKind::JsxChild
                                },
                            );
                        }
                        JSXChild::Spread(spread) => self.push(
                            spread.expression.span(),
                            if component {
                                ExecutionSiteKind::ComponentChild
                            } else {
                                ExecutionSiteKind::JsxChild
                            },
                        ),
                        _ => {}
                    }
                }
            }
        }

        impl<'b> Visit<'b> for CensusVisitor<'_, '_> {
            fn visit_jsx_element(&mut self, element: &JSXElement<'b>) {
                let component = is_component_name(&element.opening_element.name);
                let native_tag_name = (!component)
                    .then(|| Self::native_tag_name(element))
                    .flatten();
                let has_spread = element
                    .opening_element
                    .attributes
                    .iter()
                    .any(|attribute| matches!(attribute, JSXAttributeItem::SpreadAttribute(_)));
                let control_flow = match &element.opening_element.name {
                    oxc_ast::ast::JSXElementName::IdentifierReference(name) => {
                        self.built_ins.contains(name.name.as_str())
                            && !self.bindings.is_builtin_shadowed(name.span)
                    }
                    _ => false,
                };

                let attributes = if component {
                    element
                        .opening_element
                        .attributes
                        .iter()
                        .collect::<Vec<_>>()
                } else {
                    dedupe_attributes(&element.opening_element.attributes)
                };
                for item in attributes {
                    match item {
                        JSXAttributeItem::SpreadAttribute(spread) => self.push(
                            spread.argument.span(),
                            if component {
                                ExecutionSiteKind::ComponentSpread
                            } else {
                                ExecutionSiteKind::NativeSpread
                            },
                        ),
                        JSXAttributeItem::Attribute(attribute) => {
                            let Some(JSXAttributeValue::ExpressionContainer(container)) =
                                &attribute.value
                            else {
                                continue;
                            };
                            if matches!(container.expression, JSXExpression::EmptyExpression(_)) {
                                continue;
                            }
                            if container
                                .expression
                                .as_expression()
                                .is_some_and(is_literal_only_expression)
                            {
                                self.ignore_literal(container.expression.span());
                                continue;
                            }
                            let name = Self::attribute_name(&attribute.name);
                            if !component && name == "_hk" {
                                continue;
                            }
                            if !component
                                && name == "xmlns"
                                && native_tag_name.is_some_and(|tag| {
                                    tag == "svg"
                                        || tag == "math"
                                        || crate::shared::constants::svg_elements(tag)
                                        || crate::shared::constants::mathml_elements(tag)
                                })
                            {
                                continue;
                            }
                            if !component
                                && !has_spread
                                && (name == "class" || (name == "style" && self.inline_styles))
                            {
                                if let Some(oxc_ast::ast::Expression::ObjectExpression(object)) =
                                    container.expression.as_expression()
                                {
                                    let has_spread = object.properties.iter().any(|property| {
                                        matches!(
                                            property,
                                            oxc_ast::ast::ObjectPropertyKind::SpreadProperty(_)
                                        )
                                    });
                                    let decomposes = if name == "class" {
                                        Self::class_object_splits(object)
                                    } else {
                                        !has_spread
                                    };
                                    if decomposes {
                                        if name == "style"
                                            && object.properties.iter().any(|property| {
                                                matches!(
                                                    property,
                                                    oxc_ast::ast::ObjectPropertyKind::ObjectProperty(property)
                                                        if property.computed
                                                )
                                            })
                                        {
                                            self.push(
                                                container.expression.span(),
                                                ExecutionSiteKind::NativeAttribute,
                                            );
                                        }
                                        for property in &object.properties {
                                            let oxc_ast::ast::ObjectPropertyKind::ObjectProperty(
                                                property,
                                            ) = property
                                            else {
                                                unreachable!("fixed object checked above");
                                            };
                                            if property.computed {
                                                continue;
                                            }
                                            if is_literal_only_expression(&property.value) {
                                                continue;
                                            }
                                            self.push(
                                                property.value.span(),
                                                ExecutionSiteKind::NativeAttribute,
                                            );
                                        }
                                        continue;
                                    }
                                }
                            }
                            if !component && !has_spread && name == "class" {
                                if let Some(expression) = container.expression.as_expression() {
                                    if let Some(object) = Self::split_class_array_object(expression)
                                    {
                                        for property in &object.properties {
                                            let oxc_ast::ast::ObjectPropertyKind::ObjectProperty(
                                                property,
                                            ) = property
                                            else {
                                                unreachable!("split class array is fixed");
                                            };
                                            if !is_literal_only_expression(&property.value) {
                                                self.push(
                                                    property.value.span(),
                                                    ExecutionSiteKind::NativeAttribute,
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                            let kind = if name == "ref" {
                                ExecutionSiteKind::Ref
                            } else if !component && name.starts_with("on") {
                                ExecutionSiteKind::EventHandler
                            } else if !component
                                && name == "children"
                                && (has_spread || element.children.is_empty())
                            {
                                ExecutionSiteKind::JsxChild
                            } else if component {
                                ExecutionSiteKind::ComponentProperty
                            } else {
                                ExecutionSiteKind::NativeAttribute
                            };
                            self.push(container.expression.span(), kind);
                        }
                    }
                }

                for child in &element.children {
                    match child {
                        JSXChild::ExpressionContainer(container)
                            if !matches!(
                                container.expression,
                                JSXExpression::EmptyExpression(_)
                            ) =>
                        {
                            if container
                                .expression
                                .as_expression()
                                .is_some_and(is_literal_only_expression)
                            {
                                self.ignore_literal(container.expression.span());
                                continue;
                            }
                            let function = matches!(
                                container.expression,
                                JSXExpression::ArrowFunctionExpression(_)
                                    | JSXExpression::FunctionExpression(_)
                            );
                            self.push(
                                container.expression.span(),
                                if component && control_flow && function {
                                    ExecutionSiteKind::ControlFlowRender
                                } else if component {
                                    ExecutionSiteKind::ComponentChild
                                } else {
                                    ExecutionSiteKind::JsxChild
                                },
                            );
                        }
                        JSXChild::Spread(spread) => self.push(
                            spread.expression.span(),
                            if component {
                                ExecutionSiteKind::ComponentChild
                            } else {
                                ExecutionSiteKind::JsxChild
                            },
                        ),
                        _ => {}
                    }
                }

                if component {
                    self.mark_component_child_fragments(&element.children);
                }
                oxc_ast_visit::walk::walk_jsx_element(self, element);
            }

            fn visit_jsx_fragment(&mut self, fragment: &JSXFragment<'b>) {
                let component = self
                    .component_child_fragments
                    .contains(&SourceSpan::from(fragment.span));
                self.census_children(&fragment.children, component);
                if component {
                    self.mark_component_child_fragments(&fragment.children);
                }
                oxc_ast_visit::walk::walk_jsx_fragment(self, fragment);
            }
        }

        let mut visitor = CensusVisitor {
            sites: BTreeSet::new(),
            ignored_literal_spans: BTreeSet::new(),
            component_child_fragments: BTreeSet::new(),
            built_ins: built_ins.iter().map(String::as_str).collect(),
            bindings: &bindings,
            inline_styles,
        };
        visitor.visit_program(program);
        Self {
            sites: visitor.sites,
            ignored_literal_spans: visitor.ignored_literal_spans,
        }
    }
}

#[derive(Default)]
pub(crate) struct TraceRecorder {
    census: Option<ExecutionCensus>,
    decisions: BTreeMap<SiteKey, TerminalDecision>,
    error: Option<String>,
}

impl TraceRecorder {
    pub(crate) fn disabled() -> Self {
        Self::default()
    }

    pub(crate) fn new(census: ExecutionCensus) -> Self {
        Self {
            census: Some(census),
            ..Self::default()
        }
    }

    pub(crate) fn has_site(&self, span: Span, kind: ExecutionSiteKind) -> bool {
        self.census.as_ref().is_some_and(|census| {
            census.sites.contains(&SiteKey {
                span: span.into(),
                kind,
            })
        })
    }

    /// Resolve a lowered attribute value's censused site, whatever kind the
    /// census guessed for it.
    ///
    /// The census is syntactic and runs first, so it can only name a site
    /// from the attribute's spelling: `on*` becomes an event handler, `ref` a
    /// ref, an empty element's `children` a JSX child, anything else a native
    /// attribute. Lowering knows what the value actually became, and when it
    /// resolves the value as data — folded into the template, dropped, or
    /// written once — the truthful record depends on which kind the census
    /// chose:
    ///
    /// - a censused *value* site (native attribute, JSX child) is decided
    ///   with `decision`;
    /// - a censused *callback* site (event handler, ref) is withdrawn: the
    ///   value became template text, so no callback exists at runtime to
    ///   decide about, and a callback site cannot carry a value decision.
    ///
    /// A span the census never recorded is a no-op. Recording a hardcoded
    /// [`ExecutionSiteKind::NativeAttribute`] here instead — as every caller
    /// once did — failed the whole file for `on*`/`ref`/`children` spellings,
    /// either as an unresolved site or as a category mismatch.
    ///
    /// A *promoted* `children` value must not come through here: child
    /// insertion owns its decision, and the promotion (see
    /// `children_attribute_container`) only captures values the constant fold
    /// leaves alone, so the attribute pipeline never resolves those spans.
    pub(crate) fn resolve_lowered_attribute(&mut self, span: Span, decision: ValueDecision) {
        for kind in [
            ExecutionSiteKind::NativeAttribute,
            ExecutionSiteKind::JsxChild,
        ] {
            if self.has_site(span, kind) {
                self.value(span, kind, decision);
                return;
            }
        }
        for kind in [ExecutionSiteKind::EventHandler, ExecutionSiteKind::Ref] {
            self.retract(span, kind);
        }
    }

    /// Withdraw a censused site that lowering proved does not exist.
    ///
    /// Reached through [`Self::resolve_lowered_attribute`] when the census
    /// named a callback site (an `on*` spelling, a `ref`) whose value
    /// lowering then resolved as plain data. Retracting is the truthful
    /// outcome — the site is not reported, rather than reported with an
    /// invented decision.
    ///
    /// Retracting a site that was never censused, or one already decided, is a
    /// no-op; this only ever removes a site nothing has spoken for.
    pub(crate) fn retract(&mut self, span: Span, kind: ExecutionSiteKind) {
        let key = SiteKey {
            span: span.into(),
            kind,
        };
        if self.decisions.contains_key(&key) {
            return;
        }
        if let Some(census) = self.census.as_mut() {
            census.sites.remove(&key);
        }
    }

    pub(crate) fn value(&mut self, span: Span, kind: ExecutionSiteKind, decision: ValueDecision) {
        self.resolve(span, kind, TerminalDecision::Value(decision));
    }

    pub(crate) fn callback(
        &mut self,
        span: Span,
        kind: ExecutionSiteKind,
        decision: CallbackDecision,
    ) {
        self.resolve(span, kind, TerminalDecision::Callback(decision));
    }

    fn resolve(&mut self, span: Span, kind: ExecutionSiteKind, decision: TerminalDecision) {
        let Some(census) = &self.census else {
            return;
        };
        let key = SiteKey {
            span: span.into(),
            kind,
        };
        if !census.sites.contains(&key) {
            if census
                .ignored_literal_spans
                .contains(&SourceSpan::from(span))
            {
                return;
            }
            self.fail(format!(
                "semantic decision targets an uncensused {kind:?} site at {}..{}",
                span.start, span.end
            ));
            return;
        }
        if kind.is_value() != matches!(decision, TerminalDecision::Value(_)) {
            self.fail(format!(
                "semantic decision has the wrong category for {kind:?} at {}..{}",
                span.start, span.end
            ));
            return;
        }
        if let Some(previous) = self.decisions.insert(key, decision) {
            if previous != decision {
                self.fail(format!(
                    "semantic site {kind:?} at {}..{} received conflicting terminal decisions",
                    span.start, span.end
                ));
            }
        }
    }

    fn fail(&mut self, message: String) {
        if self.error.is_none() {
            self.error = Some(message);
        }
    }

    pub(crate) fn finish(self) -> Result<Option<SemanticTrace>, String> {
        let Some(census) = self.census else {
            return Ok(None);
        };
        if let Some(error) = self.error {
            return Err(error);
        }
        let unresolved = census
            .sites
            .difference(&self.decisions.keys().copied().collect())
            .map(|site| format!("{:?}@{}..{}", site.kind, site.span.start, site.span.end))
            .collect::<Vec<_>>();
        if !unresolved.is_empty() {
            return Err(format!(
                "semantic trace has unresolved execution sites: {}",
                unresolved.join(", ")
            ));
        }
        let sites = census
            .sites
            .into_iter()
            .map(|site| ExecutionSite {
                span: site.span,
                kind: site.kind,
                decision: self.decisions[&site],
            })
            .collect();
        Ok(Some(SemanticTrace { sites }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn census(kind: ExecutionSiteKind) -> ExecutionCensus {
        ExecutionCensus {
            sites: [SiteKey {
                span: SourceSpan { start: 1, end: 2 },
                kind,
            }]
            .into_iter()
            .collect(),
            ignored_literal_spans: BTreeSet::new(),
        }
    }

    #[test]
    fn finish_rejects_an_unresolved_site() {
        let recorder = TraceRecorder::new(census(ExecutionSiteKind::JsxChild));
        assert!(recorder.finish().unwrap_err().contains("unresolved"));
    }

    #[test]
    fn finish_rejects_conflicting_decisions() {
        let mut recorder = TraceRecorder::new(census(ExecutionSiteKind::JsxChild));
        recorder.value(
            Span::new(1, 2),
            ExecutionSiteKind::JsxChild,
            ValueDecision::EagerOnce,
        );
        recorder.value(
            Span::new(1, 2),
            ExecutionSiteKind::JsxChild,
            ValueDecision::ReactiveRerun,
        );
        assert!(recorder.finish().unwrap_err().contains("conflicting"));
    }

    #[test]
    fn finish_rejects_uncensused_decisions() {
        let mut recorder = TraceRecorder::new(census(ExecutionSiteKind::JsxChild));
        recorder.value(
            Span::new(3, 4),
            ExecutionSiteKind::JsxChild,
            ValueDecision::EagerOnce,
        );
        assert!(recorder.finish().unwrap_err().contains("uncensused"));
    }
}
