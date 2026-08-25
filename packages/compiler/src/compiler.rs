use oxc_allocator::Allocator;
use oxc_ast_visit::VisitMut;
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_parser::{ParseOptions, Parser};
use oxc_span::SourceType;

use crate::dom::element::{AstDomTransform, DomTransformConfig};
use crate::error::CompileError;
use crate::semantic_trace::SemanticTrace;
use crate::semantic_trace::{ExecutionCensus, TraceRecorder};
use crate::ssr::transform::AstSsrTransform;
use crate::universal::transform::{
    AstUniversalTransform, DynamicDomConfig, UniversalWrapperConfig,
};

/// Output mode selected for JSX compilation.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum Generate {
    #[default]
    Dom,
    Ssr,
    Universal,
    Dynamic,
}

/// A wrapper import setting without any Node-API representation in its interface.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub enum Wrapper {
    #[default]
    Default,
    Disabled,
    Name(String),
}

/// A native renderer routed through dynamic mode.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct Renderer {
    pub name: String,
    pub module_name: Option<String>,
    pub elements: Vec<String>,
}

/// Rust-native JSX compiler options.
///
/// Defaults describe ordinary DOM compilation. Unlike the Node adapter, the
/// required module name and output mode are represented directly rather than
/// as nullable transport fields.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompileOptions {
    pub filename: Option<String>,
    pub module_name: String,
    pub generate: Generate,
    pub hydratable: bool,
    /// SSR-only: behavior-claim (`_bnd`) marker emission for server components.
    pub server_components: bool,
    pub dev: bool,
    pub source_map: bool,
    pub context_to_custom_elements: bool,
    pub delegate_events: bool,
    pub delegated_events: Vec<String>,
    pub omit_quotes: bool,
    pub omit_attribute_spacing: bool,
    pub inline_styles: bool,
    pub effect_wrapper: Wrapper,
    pub wrap_conditionals: bool,
    pub memo_wrapper: Wrapper,
    pub patch_driver: Wrapper,
    pub static_marker: String,
    pub require_import_source: Option<String>,
    pub validate: bool,
    pub omit_nested_closing_tags: bool,
    pub omit_last_closing_tag: bool,
    pub built_ins: Vec<String>,
    pub renderers: Vec<Renderer>,
    /// Collect experimental DOM-lowering execution facts without changing
    /// generated code. Unsupported output modes return a configuration error.
    pub semantic_trace: bool,
}

impl Default for CompileOptions {
    fn default() -> Self {
        Self {
            filename: None,
            module_name: "dom".into(),
            generate: Generate::Dom,
            hydratable: false,
            server_components: false,
            dev: false,
            source_map: false,
            context_to_custom_elements: false,
            delegate_events: true,
            delegated_events: Vec::new(),
            omit_quotes: true,
            omit_attribute_spacing: true,
            inline_styles: true,
            effect_wrapper: Wrapper::Default,
            wrap_conditionals: true,
            memo_wrapper: Wrapper::Default,
            patch_driver: Wrapper::Default,
            static_marker: "@static".into(),
            require_import_source: None,
            validate: true,
            omit_nested_closing_tags: false,
            omit_last_closing_tag: true,
            built_ins: Vec::new(),
            renderers: Vec::new(),
            semantic_trace: false,
        }
    }
}

/// Owned output from the reusable compiler core.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompileOutput {
    pub code: String,
    pub source_map: Option<String>,
    /// Present only when `CompileOptions::semantic_trace` is enabled.
    pub semantic_trace: Option<SemanticTrace>,
}

/// Compile one JavaScript or TypeScript module containing JSX.
///
/// The source is borrowed for the duration of compilation; no Oxc allocator,
/// AST node, or host-adapter error crosses this interface.
pub fn compile(source: &str, options: &CompileOptions) -> Result<CompileOutput, CompileError> {
    if options.module_name.is_empty() {
        return Err(CompileError::configuration(
            "JSX compilation requires a non-empty module name",
        ));
    }
    compile_inner(source, options)
}

/// Preserve the Node transform's established acceptance of an explicitly
/// empty `moduleName` without weakening the Rust-native interface.
#[cfg(feature = "node")]
pub(crate) fn compile_for_node_adapter(
    source: &str,
    options: &CompileOptions,
) -> Result<CompileOutput, CompileError> {
    compile_inner(source, options)
}

fn compile_inner(source: &str, options: &CompileOptions) -> Result<CompileOutput, CompileError> {
    if options.semantic_trace && options.generate != Generate::Dom {
        return Err(CompileError::configuration(
            "semantic tracing currently requires the DOM generate",
        ));
    }
    let source_type = source_type_for_filename(options.filename.as_deref())?;
    let allocator = Allocator::default();
    // Babel has no ParenthesizedExpression node (parens are trivia), so the
    // transform's expression matchers must never see one either. Preserving
    // parens here can hide logical expressions from conditional wrapping and
    // desynchronize generated output from Babel.
    let parsed = Parser::new(&allocator, source, source_type)
        .with_options(ParseOptions {
            preserve_parens: false,
            ..ParseOptions::default()
        })
        .parse();

    if let Some(error) = crate::shared::parser::first_parser_error(parsed.diagnostics) {
        return Err(CompileError::parse(error));
    }

    if let Some(lib) = options.require_import_source.as_deref()
        && !has_jsx_import_source(&parsed.program, source, lib)
    {
        if options.semantic_trace {
            return Err(CompileError::configuration(
                "semantic tracing cannot claim coverage for a file skipped by requireImportSource",
            ));
        }
        return Ok(CompileOutput {
            code: source.to_string(),
            source_map: None,
            semantic_trace: None,
        });
    }

    let mut program = parsed.program;
    let mut semantic_trace = None;
    match options.generate {
        Generate::Dom => {
            let census = options.semantic_trace.then(|| {
                ExecutionCensus::from_program(&program, &options.built_ins, options.inline_styles)
            });
            let mut transform = AstDomTransform::new(
                &allocator,
                source,
                &options.module_name,
                dom_transform_config(options, options.built_ins.clone()),
            );
            if let Some(census) = census {
                transform.semantic_trace =
                    TraceRecorder::new(census, matches!(options.effect_wrapper, Wrapper::Default));
            }
            transform.visit_program(&mut program);
            if let Some(error) = transform.error.take() {
                return Err(CompileError::transform(error));
            }
            transform
                .prepend_helpers(&mut program)
                .map_err(|error| CompileError::transform(error.to_string()))?;
            semantic_trace = transform
                .semantic_trace
                .finish()
                .map_err(CompileError::transform)?;
        }
        Generate::Dynamic => {
            if let Some(renderer) = dom_renderer(&options.renderers) {
                let mut transform = AstUniversalTransform::new_dynamic(
                    &allocator,
                    source,
                    &options.module_name,
                    options.built_ins.clone(),
                    dynamic_dom_config(options, renderer, &options.module_name),
                );
                transform.visit_program(&mut program);
                if let Some(error) = transform.error.take() {
                    return Err(CompileError::transform(error));
                }
                transform.prepend_helpers(&mut program);
                if let Some(error) = transform.error.take() {
                    return Err(CompileError::transform(error));
                }
            } else {
                let mut transform = AstUniversalTransform::new(
                    &allocator,
                    source,
                    &options.module_name,
                    options.built_ins.clone(),
                    options.static_marker.clone(),
                    universal_wrapper_config(options),
                );
                transform.visit_program(&mut program);
                if let Some(error) = transform.error.take() {
                    return Err(CompileError::transform(error));
                }
                transform.prepend_helpers(&mut program);
            }
        }
        Generate::Ssr => {
            let mut transform = AstSsrTransform::new(
                &allocator,
                source,
                &options.module_name,
                options.hydratable,
                options.server_components,
                options.wrap_conditionals,
                wrapper_name(&options.memo_wrapper, "memo"),
                options.static_marker.clone(),
                options.built_ins.clone(),
            );
            transform.visit_program(&mut program);
            if let Some(error) = transform.error.take() {
                return Err(CompileError::transform(error));
            }
            transform.prepend_helpers(&mut program);
        }
        Generate::Universal => {
            let mut transform = AstUniversalTransform::new(
                &allocator,
                source,
                &options.module_name,
                options.built_ins.clone(),
                options.static_marker.clone(),
                universal_wrapper_config(options),
            );
            transform.visit_program(&mut program);
            if let Some(error) = transform.error.take() {
                return Err(CompileError::transform(error));
            }
            transform.prepend_helpers(&mut program);
        }
    }

    let build = Codegen::new()
        .with_options(CodegenOptions {
            source_map_path: options.source_map.then(|| {
                std::path::PathBuf::from(options.filename.as_deref().unwrap_or("input.jsx"))
            }),
            ..CodegenOptions::default()
        })
        .build(&program);

    Ok(CompileOutput {
        code: build.code,
        source_map: build.map.map(|map| map.to_json_string()),
        semantic_trace,
    })
}

pub(crate) fn has_jsx_import_source(
    program: &oxc_ast::ast::Program<'_>,
    source: &str,
    required: &str,
) -> bool {
    program.comments.iter().any(|comment| {
        let text = comment.content_span().source_text(source);
        let mut pieces = text.split("@jsxImportSource");
        pieces.next();
        matches!((pieces.next(), pieces.next()), (Some(rest), None) if rest.trim() == required)
    })
}

fn source_type_for_filename(filename: Option<&str>) -> Result<SourceType, CompileError> {
    filename
        .map(SourceType::from_path)
        .transpose()
        .map_err(|error| CompileError::configuration(error.to_string()))?
        .map_or_else(|| Ok(SourceType::tsx()), Ok)
}

fn dom_transform_config(options: &CompileOptions, built_ins: Vec<String>) -> DomTransformConfig {
    DomTransformConfig {
        hydratable: options.hydratable,
        dev: options.dev,
        context_to_custom_elements: options.context_to_custom_elements,
        delegate_events: options.delegate_events,
        delegated_events: options.delegated_events.clone(),
        omit_quotes: options.omit_quotes,
        omit_attribute_spacing: options.omit_attribute_spacing,
        inline_styles: options.inline_styles,
        effect_wrapper: wrapper_name(&options.effect_wrapper, "effect"),
        wrap_conditionals: options.wrap_conditionals,
        memo_wrapper: wrapper_name(&options.memo_wrapper, "memo"),
        // DORMANT by default (extraction ruling, solid DESIGN §16): compiled
        // output must not import driver exports the release core only stubs.
        // Wrapper::Default resolves to DISABLED for the patch driver; opt in
        // with an explicit name against a channel-bearing core.
        patch_driver: match &options.patch_driver {
            Wrapper::Default => None,
            other => wrapper_name(other, "patchDriver"),
        },
        static_marker: options.static_marker.clone(),
        omit_nested_closing_tags: options.omit_nested_closing_tags,
        omit_last_closing_tag: options.omit_last_closing_tag,
        validate: options.validate,
        built_ins,
        wrapper_module_name: None,
        renderer_elements: None,
    }
}

fn dynamic_dom_config<'source>(
    options: &CompileOptions,
    renderer: &'source Renderer,
    default_module_name: &'source str,
) -> DynamicDomConfig<'source> {
    let dom = dom_transform_config(options, Vec::new());
    DynamicDomConfig {
        module_name: renderer
            .module_name
            .as_deref()
            .unwrap_or(default_module_name),
        elements: renderer.elements.clone(),
        hydratable: dom.hydratable,
        dev: dom.dev,
        context_to_custom_elements: dom.context_to_custom_elements,
        delegate_events: dom.delegate_events,
        delegated_events: dom.delegated_events,
        omit_quotes: dom.omit_quotes,
        omit_attribute_spacing: dom.omit_attribute_spacing,
        inline_styles: dom.inline_styles,
        effect_wrapper: dom.effect_wrapper,
        wrap_conditionals: dom.wrap_conditionals,
        memo_wrapper: dom.memo_wrapper,
        patch_driver: dom.patch_driver,
        static_marker: dom.static_marker,
        omit_nested_closing_tags: dom.omit_nested_closing_tags,
        omit_last_closing_tag: dom.omit_last_closing_tag,
        validate: dom.validate,
    }
}

fn universal_wrapper_config(options: &CompileOptions) -> UniversalWrapperConfig {
    UniversalWrapperConfig {
        effect_wrapper: wrapper_name(&options.effect_wrapper, "effect"),
        wrap_conditionals: options.wrap_conditionals,
        memo_wrapper: wrapper_name(&options.memo_wrapper, "memo"),
    }
}

fn wrapper_name(option: &Wrapper, default: &str) -> Option<String> {
    match option {
        Wrapper::Default => Some(default.to_string()),
        Wrapper::Disabled => None,
        Wrapper::Name(name) if name.is_empty() => None,
        Wrapper::Name(name) => Some(name.clone()),
    }
}

fn dom_renderer(renderers: &[Renderer]) -> Option<&Renderer> {
    renderers.iter().find(|renderer| renderer.name == "dom")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        CallbackDecision, ExecutionSite, ExecutionSiteKind, OwnershipDecision, OwnershipSite,
        SourceSpan, TerminalDecision, ValueDecision,
    };

    fn span(source: &str, needle: &str) -> SourceSpan {
        let start = source.find(needle).expect("fixture token") as u32;
        SourceSpan {
            start,
            end: start + needle.len() as u32,
        }
    }

    #[test]
    fn compiles_without_node_feature_types() {
        let output = compile(
            "const view = <div>{name()}</div>;",
            &CompileOptions::default(),
        )
        .expect("compile JSX");
        assert!(output.code.contains("template("));
        assert!(output.code.contains("insert("));
    }

    /// An `on*` value that folds to a constant becomes template text, so no
    /// handler exists at runtime to decide about.
    ///
    /// The census names a site from the attribute's spelling, before lowering
    /// has folded anything, so it called this one an event handler; nothing
    /// then decided it, and an undecided censused site fails the compile. One
    /// such attribute anywhere therefore made the whole file unanalysable
    /// rather than merely untraced. The site is withdrawn instead.
    #[test]
    fn a_folded_event_handler_leaves_no_unresolved_site() {
        let source =
            "const handler = \"alert(1)\";\nconst view = <div onClick={handler}>{count()}</div>;";
        let trace = compile(
            source,
            &CompileOptions {
                semantic_trace: true,
                ..CompileOptions::default()
            },
        )
        .expect("a folded on* attribute must not fail the compile")
        .semantic_trace
        .expect("tracing was requested");

        assert!(
            !trace
                .sites
                .iter()
                .any(|site| site.kind == ExecutionSiteKind::EventHandler),
            "the folded handler is template text, so no handler site survives: {:?}",
            trace.sites
        );
        // Retraction is surgical: the rest of the element still traces.
        assert!(
            trace
                .sites
                .iter()
                .any(|site| site.kind == ExecutionSiteKind::JsxChild),
            "unrelated sites must be unaffected: {:?}",
            trace.sites
        );
    }

    /// The counterpart: a handler the compiler cannot fold is still a real
    /// listener, so the retraction must not swallow the ordinary case.
    #[test]
    fn an_unfoldable_event_handler_still_reports_its_site() {
        let trace = compile(
            "const view = <div onClick={props.handler} />;",
            &CompileOptions {
                semantic_trace: true,
                ..CompileOptions::default()
            },
        )
        .expect("compile with tracing")
        .semantic_trace
        .expect("tracing was requested");

        assert!(
            trace
                .sites
                .iter()
                .any(|site| site.kind == ExecutionSiteKind::EventHandler
                    && site.decision == TerminalDecision::Callback(CallbackDecision::LaterEvent)),
            "an unfoldable handler is a later-event callback: {:?}",
            trace.sites
        );
    }

    /// The same census-vs-lowering disagreement, across every spelling the
    /// census names specially and both lowering paths (the full emission for
    /// template roots, the static fast path for nested elements).
    ///
    /// Each of these once failed the whole file — the folded `on*` and `ref`
    /// as unresolved callback sites, the `children` forms and every nested
    /// form as a category mismatch, because the recording hardcoded
    /// NativeAttribute where the census had guessed another kind.
    #[test]
    fn every_folded_special_attribute_still_compiles_with_a_total_trace() {
        for source in [
            "const s = \"x\";\nconst view = <div onLy={s} />;",
            "const r = \"x\";\nconst view = <div ref={r} />;",
            "const c = \"x\";\nconst view = <div children={c} />;",
            "const s = \"x\";\nconst view = <div><span onClick={s} /></div>;",
            "const r = \"x\";\nconst view = <div><span ref={r} /></div>;",
            "const c = \"x\";\nconst view = <div><span children={c} /></div>;",
        ] {
            let trace = compile(
                source,
                &CompileOptions {
                    semantic_trace: true,
                    ..CompileOptions::default()
                },
            )
            .unwrap_or_else(|error| panic!("{source}: {error}"))
            .semantic_trace
            .expect("tracing was requested");
            assert!(
                !trace.sites.iter().any(|site| matches!(
                    site.kind,
                    ExecutionSiteKind::EventHandler | ExecutionSiteKind::Ref
                )),
                "{source}: a folded callback leaves no callback site: {:?}",
                trace.sites
            );
        }
    }

    /// The dispatch decides by the censused kind, not by dropping sites: an
    /// unfoldable ref is still a ref callback.
    #[test]
    fn an_unfoldable_ref_still_reports_its_site() {
        let trace = compile(
            "const view = <div ref={node} />;",
            &CompileOptions {
                semantic_trace: true,
                ..CompileOptions::default()
            },
        )
        .expect("compile with tracing")
        .semantic_trace
        .expect("tracing was requested");
        assert!(
            trace
                .sites
                .iter()
                .any(|site| site.kind == ExecutionSiteKind::Ref
                    && site.decision == TerminalDecision::Callback(CallbackDecision::RefApply)),
            "an unfoldable ref is a ref-apply callback: {:?}",
            trace.sites
        );
    }

    #[test]
    fn classifies_parse_and_configuration_errors() {
        let parse = compile("const view = <", &CompileOptions::default()).unwrap_err();
        assert_eq!(parse.kind(), crate::CompileErrorKind::Parse);

        let options = CompileOptions {
            filename: Some("input.txt".into()),
            ..CompileOptions::default()
        };
        let configuration = compile("const view = <div />;", &options).unwrap_err();
        assert_eq!(configuration.kind(), crate::CompileErrorKind::Configuration);
    }

    #[test]
    fn returns_an_exact_total_dom_trace_without_changing_code() {
        let source =
            "const view = <div title={name()} onClick={handle} ref={node}>{count()}</div>;";
        let plain = compile(source, &CompileOptions::default()).expect("plain compile");
        let traced = compile(
            source,
            &CompileOptions {
                semantic_trace: true,
                ..CompileOptions::default()
            },
        )
        .expect("traced compile");

        assert_eq!(traced.code, plain.code);
        assert_eq!(
            traced.semantic_trace,
            Some(SemanticTrace {
                version: crate::semantic_trace::SEMANTIC_TRACE_VERSION,
                sites: vec![
                    ExecutionSite {
                        span: span(source, "name()"),
                        kind: ExecutionSiteKind::NativeAttribute,
                        decision: TerminalDecision::Value(ValueDecision::ReactiveRerun),
                    },
                    ExecutionSite {
                        span: span(source, "handle"),
                        kind: ExecutionSiteKind::EventHandler,
                        decision: TerminalDecision::Callback(CallbackDecision::LaterEvent),
                    },
                    ExecutionSite {
                        span: span(source, "node"),
                        kind: ExecutionSiteKind::Ref,
                        decision: TerminalDecision::Callback(CallbackDecision::RefApply),
                    },
                    ExecutionSite {
                        span: span(source, "count()"),
                        kind: ExecutionSiteKind::JsxChild,
                        decision: TerminalDecision::Value(ValueDecision::ReactiveRerun),
                    },
                ],
                ownership_sites: vec![
                    OwnershipSite {
                        span: span(source, "name()"),
                        decision: OwnershipDecision::Owned,
                    },
                    OwnershipSite {
                        span: span(source, "count()"),
                        decision: OwnershipDecision::Owned,
                    },
                ],
                owner_establishments: vec![
                    crate::semantic_trace::OwnerEstablishment {
                        span: span(source, "name()"),
                        wrapper: "effect".into(),
                        group_id: None,
                    },
                    crate::semantic_trace::OwnerEstablishment {
                        span: span(source, "handle"),
                        wrapper: "delegated".into(),
                        group_id: None,
                    },
                    crate::semantic_trace::OwnerEstablishment {
                        span: span(source, "node"),
                        wrapper: "ref-apply".into(),
                        group_id: None,
                    },
                    crate::semantic_trace::OwnerEstablishment {
                        span: span(source, "count()"),
                        wrapper: "insert".into(),
                        group_id: None,
                    },
                ],
                component_render_sites: vec![],
                deferred_callback_sites: vec![],
            })
        );
    }

    #[test]
    fn rejects_trace_coverage_for_unsupported_and_bypassed_modes() {
        let ssr = compile(
            "const view = <div />;",
            &CompileOptions {
                generate: Generate::Ssr,
                semantic_trace: true,
                ..CompileOptions::default()
            },
        )
        .unwrap_err();
        assert_eq!(ssr.kind(), crate::CompileErrorKind::Configuration);

        let bypassed = compile(
            "const view = <div />;",
            &CompileOptions {
                semantic_trace: true,
                require_import_source: Some("solid-js".into()),
                ..CompileOptions::default()
            },
        )
        .unwrap_err();
        assert_eq!(bypassed.kind(), crate::CompileErrorKind::Configuration);
    }

    #[test]
    fn resolves_every_site_in_the_dom_semantics_matrix() {
        let cases = [
            "const view = <div>{1}{value}{signal()}</div>;",
            "const view = <div title={1} class={signal()} {...props} />;",
            "const view = <Widget value={signal()} plain={value} {...props} ref={node} />;",
            "const view = <Widget>{value}</Widget>;",
            "const view = <Widget>{value}{signal()}</Widget>;",
            "const view = <><div>{signal()}</div>{value}</>;",
            "const view = <div children={signal()} />;",
            "const view = <div children=\"static\" />;",
            "const view = <div><span textContent={text()} children={content()} /></div>;",
            "const view = <div><span id={id()} children={content()} /></div>;",
            "const view = <div><span ref={node} onClick={handler} children={content()} /></div>;",
            "const view = <div>{/*@static*/ signal()}</div>;",
            "const view = <div>{ok() ? left() : right()}</div>;",
            "const view = <div title={first()} title={last()} />;",
            "const view = <div children={ignored()}>{shown()}</div>;",
            "const view = <div {...props} title={signal()} onClick={handle} ref={node} />;",
            "const view = <textarea value={signal()} />;",
            "const view = <div style={{ color: signal() }} class={{ active: signal() }} />;",
            "const view = <div><span>{1}</span></div>;",
            "const view = <div><span title={1}>{1}</span></div>;",
        ];
        for source in cases {
            compile(
                source,
                &CompileOptions {
                    semantic_trace: true,
                    ..CompileOptions::default()
                },
            )
            .unwrap_or_else(|error| panic!("{source}: {error}"));
        }
    }

    #[test]
    fn records_control_flow_callbacks_separately_from_component_children() {
        let source = "const view = <For each={items()}>{item => <span>{item.name}</span>}</For>;";
        let output = compile(
            source,
            &CompileOptions {
                semantic_trace: true,
                built_ins: vec!["For".into()],
                ..CompileOptions::default()
            },
        )
        .expect("control-flow trace");
        assert_eq!(
            output.semantic_trace,
            Some(SemanticTrace {
                version: crate::semantic_trace::SEMANTIC_TRACE_VERSION,
                sites: vec![
                    ExecutionSite {
                        span: span(source, "items()"),
                        kind: ExecutionSiteKind::ComponentProperty,
                        decision: TerminalDecision::Value(ValueDecision::CallerContext),
                    },
                    ExecutionSite {
                        span: span(source, "item => <span>{item.name}</span>"),
                        kind: ExecutionSiteKind::ControlFlowRender,
                        decision: TerminalDecision::Callback(CallbackDecision::LaterRender),
                    },
                    ExecutionSite {
                        span: span(source, "item.name"),
                        kind: ExecutionSiteKind::JsxChild,
                        decision: TerminalDecision::Value(ValueDecision::ReactiveRerun),
                    },
                ],
                ownership_sites: vec![OwnershipSite {
                    span: span(source, "item.name"),
                    decision: OwnershipDecision::Owned,
                }],
                owner_establishments: vec![
                    crate::semantic_trace::OwnerEstablishment {
                        span: span(
                            source,
                            "<For each={items()}>{item => <span>{item.name}</span>}</For>"
                        ),
                        wrapper: "createComponent".into(),
                        group_id: None,
                    },
                    crate::semantic_trace::OwnerEstablishment {
                        span: span(source, "item.name"),
                        wrapper: "insert".into(),
                        group_id: None,
                    },
                ],
                component_render_sites: vec![crate::semantic_trace::ComponentRenderSite {
                    span: span(
                        source,
                        "<For each={items()}>{item => <span>{item.name}</span>}</For>"
                    ),
                }],
                deferred_callback_sites: vec![
                    crate::semantic_trace::DeferredCallbackSite {
                        span: span(source, "items()"),
                        receiver_span: span(
                            source,
                            "<For each={items()}>{item => <span>{item.name}</span>}</For>"
                        ),
                    },
                    crate::semantic_trace::DeferredCallbackSite {
                        span: span(source, "item => <span>{item.name}</span>"),
                        receiver_span: span(
                            source,
                            "<For each={items()}>{item => <span>{item.name}</span>}</For>"
                        ),
                    }
                ],
            })
        );
    }

    #[test]
    fn traces_fragment_returned_from_component_child_iife() {
        let source = r#"
            const view = (
                <Layer>
                    {(() => {
                        return (
                            <>
                                {renderActiveLayer(computed().points)}
                                {condition ? renderActiveLayer(otherPoints) : null}
                            </>
                        );
                    })()}
                </Layer>
            );
        "#;

        compile(
            source,
            &CompileOptions {
                semantic_trace: true,
                ..CompileOptions::default()
            },
        )
        .expect("semantic tracing should cover fragments returned from component child IIFEs");
    }

    #[test]
    fn fragment_sites_follow_their_lowering_context() {
        for (source, needle, expected_kind) in [
            (
                "const view = <div>{(() => <><>{nativeChild()}</></>)()}</div>;",
                "nativeChild()",
                ExecutionSiteKind::JsxChild,
            ),
            (
                "const view = <Layer><><>{componentChild()}</></></Layer>;",
                "componentChild()",
                ExecutionSiteKind::ComponentChild,
            ),
            (
                "const view = <For each={items()}>{item => <>{renderItem(item())}</>}</For>;",
                "renderItem(item())",
                ExecutionSiteKind::JsxChild,
            ),
            (
                "const view = () => <><>{arrowResult()}</></>;",
                "arrowResult()",
                ExecutionSiteKind::JsxChild,
            ),
            (
                "const view = <Layer content={<><Widget detail={<>{property()}</>} /></>} />;",
                "property()",
                ExecutionSiteKind::JsxChild,
            ),
        ] {
            let output = compile(
                source,
                &CompileOptions {
                    semantic_trace: true,
                    ..CompileOptions::default()
                },
            )
            .unwrap_or_else(|error| panic!("{source}: {error}"));
            let trace = output.semantic_trace.expect("semantic trace");
            let site = trace
                .sites
                .iter()
                .find(|site| site.span == span(source, needle))
                .unwrap_or_else(|| panic!("missing {needle} site for {source}"));
            assert_eq!(site.kind, expected_kind, "wrong site kind for {source}");
        }
    }

    #[test]
    fn nested_fragments_compile_across_dom_ssr_and_universal() {
        let sources = [
            "const view = <div>{(() => <><>{nativeChild()}</></>)()}</div>;",
            "const view = <Layer><><>{componentChild()}</></></Layer>;",
            "const view = <Layer>{(() => <>{iifeResult()}</>)()}</Layer>;",
            "const view = () => <><>{arrowResult()}</></>;",
            "const view = <Layer content={<><Widget detail={<>{property()}</>} /></>} />;",
        ];

        for generate in [Generate::Dom, Generate::Ssr, Generate::Universal] {
            for source in sources {
                compile(
                    source,
                    &CompileOptions {
                        generate,
                        ..CompileOptions::default()
                    },
                )
                .unwrap_or_else(|error| panic!("{generate:?}: {source}: {error}"));
            }
        }
    }

    #[test]
    fn uses_utf8_byte_spans_and_records_semantics_affecting_options() {
        let source = "const label = '🔥'; const view = <div title={signal()} />;";
        let output = compile(
            source,
            &CompileOptions {
                semantic_trace: true,
                effect_wrapper: Wrapper::Disabled,
                hydratable: true,
                dev: true,
                ..CompileOptions::default()
            },
        )
        .expect("option trace");
        assert_eq!(
            output.semantic_trace,
            Some(SemanticTrace {
                version: crate::semantic_trace::SEMANTIC_TRACE_VERSION,
                sites: vec![ExecutionSite {
                    span: span(source, "signal()"),
                    kind: ExecutionSiteKind::NativeAttribute,
                    decision: TerminalDecision::Value(ValueDecision::EagerOnce),
                }],
                ownership_sites: vec![],
                owner_establishments: vec![],
                component_render_sites: vec![],
                deferred_callback_sites: vec![],
            })
        );
        let byte_span = span(source, "signal()");
        let character_start = source[..byte_span.start as usize].chars().count() as u32;
        assert!(byte_span.start > character_start);
    }
}
