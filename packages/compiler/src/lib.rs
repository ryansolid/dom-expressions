mod config;
mod dom;
mod shared;
mod ssr;
mod universal;

use napi::bindgen_prelude::*;
use napi_derive::napi;
use oxc_allocator::Allocator;
use oxc_ast_visit::VisitMut;
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_parser::{ParseOptions, Parser};

use config::source_type_for_filename;
use config::RendererOption;
pub use config::{TransformOptions, TransformResult};
use dom::element::{AstDomTransform, DomTransformConfig};
use ssr::transform::AstSsrTransform;
use universal::transform::{AstUniversalTransform, DynamicDomConfig, UniversalWrapperConfig};

#[napi]
pub fn transform(code: String, options: Option<TransformOptions>) -> Result<TransformResult> {
    let options = options.unwrap_or_default();
    let source_type = source_type_for_filename(options.filename.as_deref())?;
    let allocator = Allocator::default();
    // Babel has no ParenthesizedExpression node (parens are trivia), so the
    // transform's expression matchers must never see one either — with the oxc
    // default (`preserve_parens: true`), `(a && b()) || c` hides the logical
    // from the conditional-wrapping logic and the generates desync.
    let parsed = Parser::new(&allocator, &code, source_type)
        .with_options(ParseOptions {
            preserve_parens: false,
            ..ParseOptions::default()
        })
        .parse();

    if let Some(error) = parsed.errors.into_iter().next() {
        return Err(Error::from_reason(error.to_string()));
    }

    // Babel's `requireImportSource` preprocess: skip files without a
    // `@jsxImportSource <lib>` comment, returning the source untouched.
    if let Some(lib) = options.require_import_source.as_deref() {
        let has_pragma = parsed.program.comments.iter().any(|comment| {
            let text = comment.content_span().source_text(&code);
            let mut pieces = text.split("@jsxImportSource");
            // Babel: exactly one occurrence, and the comment's remainder
            // (trimmed) must equal the configured source.
            pieces.next();
            match (pieces.next(), pieces.next()) {
                (Some(rest), None) => rest.trim() == lib,
                _ => false,
            }
        });
        if !has_pragma {
            return Ok(TransformResult { code, map: None });
        }
    }

    let module_name = options
        .module_name
        .as_deref()
        .ok_or_else(|| Error::from_reason("AST-native transform requires a `moduleName` option"))?;

    let mut program = parsed.program;
    match options.generate.as_deref().unwrap_or("dom") {
        "dom" => {
            let mut transform = AstDomTransform::new(
                &allocator,
                &code,
                module_name,
                dom_transform_config(&options, built_ins(&options)),
            );
            transform.visit_program(&mut program);
            if let Some(error) = transform.error {
                return Err(Error::from_reason(error));
            }
            transform.prepend_helpers(&mut program)?;
        }
        "dynamic" => {
            if let Some(renderer) = dom_renderer(options.renderers.as_deref()) {
                let mut transform = AstUniversalTransform::new_dynamic(
                    &allocator,
                    &code,
                    module_name,
                    built_ins(&options),
                    dynamic_dom_config(&options, renderer, module_name),
                );
                transform.visit_program(&mut program);
                if let Some(error) = transform.error {
                    return Err(Error::from_reason(error));
                }
                transform.prepend_helpers(&mut program);
                if let Some(error) = transform.error {
                    return Err(Error::from_reason(error));
                }
            } else {
                let mut transform = AstUniversalTransform::new(
                    &allocator,
                    &code,
                    module_name,
                    built_ins(&options),
                    static_marker(&options),
                    universal_wrapper_config(&options),
                );
                transform.visit_program(&mut program);
                if let Some(error) = transform.error {
                    return Err(Error::from_reason(error));
                }
                transform.prepend_helpers(&mut program);
            }
        }
        "ssr" => {
            let mut transform = AstSsrTransform::new(
                &allocator,
                &code,
                module_name,
                options.hydratable.unwrap_or(false),
                options.wrap_conditionals.unwrap_or(true),
                wrapper_name(&options.memo_wrapper, "memo"),
                static_marker(&options),
                built_ins(&options),
            );
            transform.visit_program(&mut program);
            if let Some(error) = transform.error {
                return Err(Error::from_reason(error));
            }
            transform.prepend_helpers(&mut program);
        }
        "universal" => {
            let mut transform = AstUniversalTransform::new(
                &allocator,
                &code,
                module_name,
                built_ins(&options),
                static_marker(&options),
                universal_wrapper_config(&options),
            );
            transform.visit_program(&mut program);
            if let Some(error) = transform.error {
                return Err(Error::from_reason(error));
            }
            transform.prepend_helpers(&mut program);
        }
        _ => {
            return Err(Error::from_reason(
                "The @dom-expressions/compiler backend implements DOM, SSR, universal, and dynamic modes only",
            ));
        }
    }

    let build = Codegen::new()
        .with_options(CodegenOptions {
            source_map_path: options.source_map.unwrap_or(false).then(|| {
                std::path::PathBuf::from(options.filename.as_deref().unwrap_or("input.jsx"))
            }),
            ..CodegenOptions::default()
        })
        .build(&program);

    Ok(TransformResult {
        code: build.code,
        map: build.map.map(|map| map.to_json_string()),
    })
}

fn dom_transform_config(options: &TransformOptions, built_ins: Vec<String>) -> DomTransformConfig {
    DomTransformConfig {
        hydratable: options.hydratable.unwrap_or(false),
        dev: options.dev.unwrap_or(false),
        context_to_custom_elements: options.context_to_custom_elements.unwrap_or(false),
        delegate_events: options.delegate_events.unwrap_or(true),
        delegated_events: options.delegated_events.clone().unwrap_or_default(),
        omit_quotes: options.omit_quotes.unwrap_or(true),
        omit_attribute_spacing: options.omit_attribute_spacing.unwrap_or(true),
        inline_styles: options.inline_styles.unwrap_or(true),
        effect_wrapper: wrapper_name(&options.effect_wrapper, "effect"),
        wrap_conditionals: options.wrap_conditionals.unwrap_or(true),
        memo_wrapper: wrapper_name(&options.memo_wrapper, "memo"),
        static_marker: static_marker(options),
        omit_nested_closing_tags: options.omit_nested_closing_tags.unwrap_or(false),
        omit_last_closing_tag: options.omit_last_closing_tag.unwrap_or(true),
        validate: options.validate.unwrap_or(true),
        built_ins,
        wrapper_module_name: None,
        renderer_elements: None,
    }
}

fn dynamic_dom_config<'source>(
    options: &TransformOptions,
    renderer: &'source RendererOption,
    default_module_name: &'source str,
) -> DynamicDomConfig<'source> {
    let dom = dom_transform_config(options, std::vec::Vec::new());
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
        static_marker: dom.static_marker,
        omit_nested_closing_tags: dom.omit_nested_closing_tags,
        omit_last_closing_tag: dom.omit_last_closing_tag,
        validate: dom.validate,
    }
}

fn universal_wrapper_config(options: &TransformOptions) -> UniversalWrapperConfig {
    UniversalWrapperConfig {
        effect_wrapper: wrapper_name(&options.effect_wrapper, "effect"),
        wrap_conditionals: options.wrap_conditionals.unwrap_or(true),
        memo_wrapper: wrapper_name(&options.memo_wrapper, "memo"),
    }
}

/// Babel's wrapper options are import-name strings with falsy disabling the
/// wrap (`effectWrapper: "createRenderEffect"`); `true` selects the default
/// name so boolean shorthand keeps working.
fn wrapper_name(option: &Option<Either<bool, String>>, default: &str) -> Option<String> {
    match option {
        None | Some(Either::A(true)) => Some(default.to_string()),
        Some(Either::A(false)) => None,
        Some(Either::B(name)) if name.is_empty() => None,
        Some(Either::B(name)) => Some(name.clone()),
    }
}

fn static_marker(options: &TransformOptions) -> String {
    options
        .static_marker
        .clone()
        .unwrap_or_else(|| "@static".to_string())
}

fn built_ins(options: &TransformOptions) -> Vec<String> {
    options.built_ins.clone().unwrap_or_default()
}

fn dom_renderer(renderers: Option<&[RendererOption]>) -> Option<&RendererOption> {
    renderers
        .unwrap_or(&[])
        .iter()
        .find(|renderer| renderer.name == "dom")
}
