use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

use serde::{Deserialize, Serialize};

use oxc_ast::ast::{
    JSXAttributeItem, JSXAttributeName, JSXAttributeValue, JSXChild, JSXElement, JSXExpression,
    JSXFragment, Program,
};
use oxc_ast_visit::Visit;
use oxc_span::{GetSpan, Span};

/// Version of the typed semantic-trace schema.
pub const SEMANTIC_TRACE_VERSION: u32 = 2;

use crate::shared::attr_plan::static_style_key;
use crate::shared::bindings::BindingTable;
use crate::shared::utils::{
    dedupe_attributes, is_component_name, is_literal_only_expression, is_void_element,
};

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(deny_unknown_fields)]
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

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "kebab-case")]
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

#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ValueDecision {
    EagerOnce,
    ReactiveRerun,
    CallerContext,
    Elided,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum CallbackDecision {
    LaterEvent,
    LaterRender,
    RefApply,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TerminalDecision {
    Value(ValueDecision),
    Callback(CallbackDecision),
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ExecutionSite {
    pub span: SourceSpan,
    pub kind: ExecutionSiteKind,
    pub decision: TerminalDecision,
}

/// Reactive owner state established by compiler-generated lowering around a
/// source region. The trace reports only states the compiler proves; absence
/// means the surrounding runtime or caller determines ownership.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum OwnershipDecision {
    Owned,
    Unowned,
    Leaf,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(deny_unknown_fields)]
pub struct OwnershipSite {
    pub span: SourceSpan,
    pub decision: OwnershipDecision,
}

/// Experimental facts about how JSX source values and callbacks are lowered
/// and executed in DOM mode.
#[derive(Clone, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(deny_unknown_fields)]
pub struct OwnerEstablishment {
    pub span: SourceSpan,
    pub wrapper: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_id: Option<u64>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ComponentRenderSite {
    pub span: SourceSpan,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DeferredCallbackSite {
    pub span: SourceSpan,
    pub receiver_span: SourceSpan,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct SemanticTrace {
    pub version: u32,
    pub sites: Vec<ExecutionSite>,
    pub ownership_sites: Vec<OwnershipSite>,
    #[serde(default)]
    pub owner_establishments: Vec<OwnerEstablishment>,
    #[serde(default)]
    pub component_render_sites: Vec<ComponentRenderSite>,
    #[serde(default)]
    pub deferred_callback_sites: Vec<DeferredCallbackSite>,
}

impl Default for SemanticTrace {
    fn default() -> Self {
        Self {
            version: SEMANTIC_TRACE_VERSION,
            sites: Vec::new(),
            ownership_sites: Vec::new(),
            owner_establishments: Vec::new(),
            component_render_sites: Vec::new(),
            deferred_callback_sites: Vec::new(),
        }
    }
}

impl ValueDecision {
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::EagerOnce => "eager-once",
            Self::ReactiveRerun => "reactive-rerun",
            Self::CallerContext => "caller-context",
            Self::Elided => "elided",
        }
    }
}

impl CallbackDecision {
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::LaterEvent => "later-event",
            Self::LaterRender => "later-render",
            Self::RefApply => "ref-apply",
        }
    }
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
            /// Void native elements whose child list survives into DOM
            /// lowering. See [`Self::mark_nested_void_children`].
            nested_void_elements: BTreeSet<SourceSpan>,
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

            fn stateful_dynamic_key(
                tag_name: Option<&str>,
                name: &str,
                value: &JSXExpression<'_>,
            ) -> Option<String> {
                let expression = value.as_expression()?;
                if tag_name.is_none() || is_literal_only_expression(expression) {
                    return None;
                }
                let tag_name = tag_name?.to_ascii_uppercase();
                let stateful = match tag_name.as_str() {
                    "INPUT" => matches!(
                        name,
                        "value"
                            | "defaultValue"
                            | "checked"
                            | "defaultChecked"
                            | "prop:value"
                            | "prop:defaultValue"
                            | "prop:checked"
                            | "prop:defaultChecked"
                    ),
                    "SELECT" => matches!(name, "value" | "prop:value"),
                    "OPTION" => matches!(
                        name,
                        "value"
                            | "selected"
                            | "defaultSelected"
                            | "prop:value"
                            | "prop:selected"
                            | "prop:defaultSelected"
                    ),
                    "TEXTAREA" => matches!(
                        name,
                        "value" | "defaultValue" | "prop:value" | "prop:defaultValue"
                    ),
                    "VIDEO" | "AUDIO" => matches!(
                        name,
                        "muted" | "defaultMuted" | "prop:muted" | "prop:defaultMuted"
                    ),
                    _ => false,
                };
                stateful.then(|| {
                    if name.starts_with("prop:") {
                        name.to_string()
                    } else {
                        format!("prop:{name}")
                    }
                })
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

            /// Record which void children of a *native* element keep their own
            /// children through lowering.
            ///
            /// A void element's child list survives exactly when the element is
            /// lowered as a nested native child: `lower_dynamic_native_child`
            /// walks into `lower_dom_children` unconditionally, so
            /// `<div><br>{x()}</br></div>` emits a real reactive
            /// `insert(_el$2, x)` into the `<br>`. Every other position makes
            /// the void element a template root of its own — a bare JSX root, a
            /// fragment child, a component child, an attribute value — and
            /// `lower_dom_element` gates child lowering on `!is_void_element`,
            /// so the child list is discarded with no code emitted.
            ///
            /// Only a native parent marks: a component's children and a
            /// fragment's children each become their own template root.
            fn mark_nested_void_children(&mut self, children: &[JSXChild<'_>]) {
                for child in children {
                    if let JSXChild::Element(child) = child
                        && let Some(tag) = Self::native_tag_name(child)
                        && !is_component_name(&child.opening_element.name)
                        && is_void_element(tag)
                    {
                        self.nested_void_elements.insert(child.span.into());
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
                let mut last_stateful = HashMap::new();
                for item in &attributes {
                    let JSXAttributeItem::Attribute(attribute) = item else {
                        continue;
                    };
                    let Some(JSXAttributeValue::ExpressionContainer(container)) = &attribute.value
                    else {
                        continue;
                    };
                    let name = Self::attribute_name(&attribute.name);
                    if let Some(key) =
                        Self::stateful_dynamic_key(native_tag_name, &name, &container.expression)
                    {
                        last_stateful.insert(key, attribute.span);
                    }
                }
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
                            let name = Self::attribute_name(&attribute.name);
                            if !component
                                && name == "children"
                                && let Some(JSXAttributeValue::StringLiteral(value)) =
                                    &attribute.value
                            {
                                // Upstream `bba3db6c` promotes an
                                // unbraced string attribute into a synthesized
                                // JSX expression container. Child lowering
                                // consequently records at the original string
                                // span, but literal-only values are not
                                // execution sites. Remember the span so that
                                // recording remains a no-op, exactly as for a
                                // braced literal child.
                                self.ignore_literal(value.span);
                                continue;
                            }
                            let Some(JSXAttributeValue::ExpressionContainer(container)) =
                                &attribute.value
                            else {
                                continue;
                            };
                            if matches!(container.expression, JSXExpression::EmptyExpression(_)) {
                                continue;
                            }
                            if !component
                                && Self::stateful_dynamic_key(
                                    native_tag_name,
                                    &name,
                                    &container.expression,
                                )
                                .is_some_and(|key| last_stateful.get(&key) != Some(&attribute.span))
                            {
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
                                && let Some(oxc_ast::ast::Expression::ObjectExpression(object)) =
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
                            if !component
                                && !has_spread
                                && name == "class"
                                && let Some(expression) = container.expression.as_expression()
                                && let Some(object) = Self::split_class_array_object(expression)
                            {
                                for property in &object.properties {
                                    let oxc_ast::ast::ObjectPropertyKind::ObjectProperty(property) =
                                        property
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
                            let kind = if name == "ref" {
                                ExecutionSiteKind::Ref
                            } else if !component && name.starts_with("on") {
                                ExecutionSiteKind::EventHandler
                            // `children` is promoted to a child insert only
                            // where lowering promotes it: `lower_dom_element`
                            // gates the capture on `!is_void_element`, so on a
                            // void element the value stays an attribute (and,
                            // as in Babel, emits nothing at all).
                            } else if !component
                                && name == "children"
                                && !native_tag_name.is_some_and(is_void_element)
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

                // A void native element that is a template root discards its
                // child list before the 2.0 lowering pass reaches it; do not
                // census expressions the emitter never resolves. A void element
                // in *nested* native-child position keeps them — see
                // `mark_nested_void_children` — so it censuses like any other
                // native element. Attributes are censused either way above:
                // they are not children, and lowering emits them for both
                // shapes.
                if native_tag_name.is_some_and(is_void_element)
                    && !self
                        .nested_void_elements
                        .contains(&SourceSpan::from(element.span))
                {
                    oxc_ast_visit::walk::walk_jsx_opening_element(self, &element.opening_element);
                    return;
                }
                if !component {
                    self.mark_nested_void_children(&element.children);
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
            nested_void_elements: BTreeSet::new(),
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
    /// Spans a lowering path *synthesizes* rather than reads from the source
    /// tree. See [`Self::ignore_synthesized_child`].
    synthesized_spans: BTreeSet<SourceSpan>,
    default_effect_wrapper: bool,
    // Compatibility output for the currently pinned checker. This is filled
    // when lowering resolves a reactive value, rather than reconstructed from
    // the finished site list.
    ownership_sites: Vec<OwnershipSite>,
    owner_establishments: Vec<OwnerEstablishment>,
    component_render_sites: Vec<ComponentRenderSite>,
    deferred_callback_sites: Vec<DeferredCallbackSite>,
    next_group_id: u64,
    error: Option<String>,
}

impl TraceRecorder {
    pub(crate) fn disabled() -> Self {
        Self::default()
    }

    pub(crate) fn new(census: ExecutionCensus, default_effect_wrapper: bool) -> Self {
        Self {
            census: Some(census),
            default_effect_wrapper,
            ..Self::default()
        }
    }

    pub(crate) fn next_group_id(&mut self) -> u64 {
        let group_id = self.next_group_id;
        self.next_group_id = self.next_group_id.wrapping_add(1);
        group_id
    }

    pub(crate) fn is_recording(&self) -> bool {
        self.census.is_some()
    }

    pub(crate) fn owner_establishment(&mut self, span: Span, wrapper: &str, group_id: Option<u64>) {
        if self.census.is_some() {
            self.owner_establishments.push(OwnerEstablishment {
                span: span.into(),
                wrapper: wrapper.to_string(),
                group_id,
            });
        }
    }

    pub(crate) fn component_render_site(&mut self, span: Span) {
        if self.census.is_some() {
            self.component_render_sites
                .push(ComponentRenderSite { span: span.into() });
        }
    }

    pub(crate) fn deferred_callback_site(&mut self, span: Span, receiver_span: Span) {
        if self.census.is_some() {
            self.deferred_callback_sites.push(DeferredCallbackSite {
                span: span.into(),
                receiver_span: receiver_span.into(),
            });
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
    /// A template-root `children` value promoted by upstream must not come
    /// through here: child insertion owns its decision, and the attribute
    /// pipeline is told that the child came from the attribute.
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

    /// Withdraw every censused site inside a source range whose lowering the
    /// emitter skipped wholesale.
    ///
    /// Reached when a lowering path discards a whole child list rather than
    /// deciding it value by value — the textarea `value` fold or an inert
    /// `<noscript>`. Nothing in the range is
    /// emitted, so no site there exists to decide; retracting is the truthful
    /// outcome, and the alternative is a file-wide "unresolved execution
    /// sites" failure over expressions that never run.
    ///
    /// A site already decided is kept, matching [`Self::retract`]: this only
    /// removes sites nothing has spoken for.
    pub(crate) fn retract_within(&mut self, span: Span) {
        let Self {
            census, decisions, ..
        } = self;
        let Some(census) = census.as_mut() else {
            return;
        };
        census.sites.retain(|site| {
            decisions.contains_key(site) || site.span.start < span.start || site.span.end > span.end
        });
    }

    /// Declare that a span carries a child the lowering *synthesized*, so a
    /// decision recorded there is not an execution site.
    ///
    /// The textarea `value` fold builds its replacement child out of the
    /// attribute (`stateful_value_child`) and spans it at the attribute. That
    /// child is not a source expression — nothing the author wrote executes at
    /// that span — so the census, which only walks source, rightly claims no
    /// site there. Where the synthesized value is a string or number the
    /// census has already ignored the literal it was cloned from; where it is
    /// the `true` of a valueless `value` the expression does not exist in the
    /// source at all, and lowering's `insert` decision would otherwise fail
    /// the file as a decision for an uncensused site.
    ///
    /// Silence, not a site, is the truthful outcome: the emitted `insert` is
    /// still reported as an `owner_establishment`, exactly as for a
    /// literal-only source hole, and joins to no site.
    ///
    /// Invariant: `resolve()` consults these spans only when the census holds
    /// no site there, and every span registered here is an attribute span,
    /// which no source expression can exactly occupy. A future caller that
    /// registers a span a censused source expression *does* occupy would
    /// silence that site's decision instead of failing the file — do not.
    pub(crate) fn ignore_synthesized_child(&mut self, span: Span) {
        if self.census.is_some() && span.start < span.end {
            self.synthesized_spans.insert(span.into());
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
        let not_a_site = census
            .ignored_literal_spans
            .contains(&SourceSpan::from(span))
            || self.synthesized_spans.contains(&SourceSpan::from(span));
        if !census.sites.contains(&key) {
            if not_a_site {
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
        if let Some(previous) = self.decisions.insert(key, decision)
            && previous != decision
        {
            self.fail(format!(
                "semantic site {kind:?} at {}..{} received conflicting terminal decisions",
                span.start, span.end
            ));
        } else if self.default_effect_wrapper
            && matches!(
                decision,
                TerminalDecision::Value(ValueDecision::ReactiveRerun)
            )
        {
            self.ownership_sites.push(OwnershipSite {
                span: span.into(),
                decision: OwnershipDecision::Owned,
            });
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
            .collect::<Vec<_>>();
        let mut ownership_sites = self.ownership_sites;
        ownership_sites.sort_unstable();
        ownership_sites.dedup();
        let mut owner_establishments = self.owner_establishments;
        owner_establishments.sort_unstable();
        owner_establishments.dedup();
        let mut component_render_sites = self.component_render_sites;
        component_render_sites.sort_unstable();
        component_render_sites.dedup();
        let mut deferred_callback_sites = self.deferred_callback_sites;
        deferred_callback_sites.sort_unstable();
        deferred_callback_sites.dedup();
        Ok(Some(SemanticTrace {
            version: SEMANTIC_TRACE_VERSION,
            sites,
            ownership_sites,
            owner_establishments,
            component_render_sites,
            deferred_callback_sites,
        }))
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
        let recorder = TraceRecorder::new(census(ExecutionSiteKind::JsxChild), true);
        assert!(recorder.finish().unwrap_err().contains("unresolved"));
    }

    #[test]
    fn finish_rejects_conflicting_decisions() {
        let mut recorder = TraceRecorder::new(census(ExecutionSiteKind::JsxChild), true);
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
        let mut recorder = TraceRecorder::new(census(ExecutionSiteKind::JsxChild), true);
        recorder.value(
            Span::new(3, 4),
            ExecutionSiteKind::JsxChild,
            ValueDecision::EagerOnce,
        );
        assert!(recorder.finish().unwrap_err().contains("uncensused"));
    }

    #[test]
    fn owner_establishments_keep_a_shared_group_id_and_sort_deterministically() {
        let mut recorder = TraceRecorder::new(census(ExecutionSiteKind::JsxChild), true);
        recorder.value(
            Span::new(1, 2),
            ExecutionSiteKind::JsxChild,
            ValueDecision::ReactiveRerun,
        );
        assert_eq!(
            recorder.finish().unwrap().unwrap().ownership_sites,
            vec![OwnershipSite {
                span: SourceSpan { start: 1, end: 2 },
                decision: OwnershipDecision::Owned,
            }]
        );

        let mut recorder = TraceRecorder::new(census(ExecutionSiteKind::JsxChild), true);
        let group_id = recorder.next_group_id();
        recorder.value(
            Span::new(1, 2),
            ExecutionSiteKind::JsxChild,
            ValueDecision::EagerOnce,
        );
        recorder.owner_establishment(Span::new(3, 4), "effect", Some(group_id));
        recorder.owner_establishment(Span::new(1, 2), "effect", Some(group_id));
        let trace = recorder.finish().unwrap().unwrap();
        assert_eq!(
            trace.owner_establishments,
            vec![
                OwnerEstablishment {
                    span: SourceSpan { start: 1, end: 2 },
                    wrapper: "effect".into(),
                    group_id: Some(0),
                },
                OwnerEstablishment {
                    span: SourceSpan { start: 3, end: 4 },
                    wrapper: "effect".into(),
                    group_id: Some(0),
                },
            ]
        );
    }

    #[test]
    fn custom_effect_reruns_make_no_owner_claim() {
        let mut recorder = TraceRecorder::new(census(ExecutionSiteKind::JsxChild), false);
        recorder.value(
            Span::new(1, 2),
            ExecutionSiteKind::JsxChild,
            ValueDecision::ReactiveRerun,
        );
        assert!(
            recorder
                .finish()
                .unwrap()
                .unwrap()
                .ownership_sites
                .is_empty()
        );
    }

    #[test]
    fn disabled_recorders_do_not_allocate_additive_facts() {
        let mut recorder = TraceRecorder::disabled();
        recorder.owner_establishment(Span::new(1, 2), "customEffect", None);
        recorder.component_render_site(Span::new(1, 2));
        recorder.deferred_callback_site(Span::new(1, 2), Span::new(3, 4));
        assert_eq!(recorder.finish().unwrap(), None);
    }
}
