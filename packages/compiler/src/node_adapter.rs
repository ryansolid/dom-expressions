use napi::bindgen_prelude::*;
use napi_derive::napi;
use oxc_allocator::Allocator;
use oxc_parser::{ParseOptions, Parser};

pub use crate::config::{TransformOptions, TransformResult};
pub use crate::directives::{
    DirectiveImportOption, ServerFunctionMeta, TransformDirectivesOptions,
    TransformDirectivesResult,
};
pub use crate::lazy::TransformLazyOptions;
pub use crate::refresh::TransformRefreshOptions;
use crate::{CompileOptions, Generate, Renderer, Wrapper};

/// The `"use server"` directive pass — a second, independent transform over
/// the same parse infrastructure as the JSX pass. Applies to plain
/// `.js`/`.ts` modules as well as JSX/TSX.
#[napi]
pub fn transform_directives(
    code: String,
    options: Option<TransformDirectivesOptions>,
) -> Result<TransformDirectivesResult> {
    crate::directives::transform_directives(code, options)
}

/// The `lazy()` module-URL pass — injects `__SOLID_LAZY_MODULE__:` placeholder
/// arguments into `lazy(() => import("..."))` calls for the bundler plugin to
/// resolve. Ported from vite-plugin-solid's `lazy-module-url` Babel plugin.
#[napi]
pub fn transform_lazy(
    code: String,
    options: Option<TransformLazyOptions>,
) -> Result<TransformResult> {
    crate::lazy::transform_lazy(code, options)
}

/// The solid-refresh HMR pass — wraps components in `$$component(...)`
/// registrations targeting the frozen solid-refresh runtime ABI. Ported from
/// the `solid-refresh` Babel plugin (jsx: false mode).
#[napi]
pub fn transform_refresh(
    code: String,
    options: Option<TransformRefreshOptions>,
) -> Result<TransformResult> {
    crate::refresh::transform_refresh(code, options)
}

#[napi]
pub fn transform(code: String, options: Option<TransformOptions>) -> Result<TransformResult> {
    let options = options.unwrap_or_default();
    if options.module_name.is_none() || !supported_generate(options.generate.as_deref()) {
        if let Some(result) = legacy_preflight(&code, &options)? {
            return Ok(result);
        }
    }
    let options = core_options(options)?;
    let output = crate::compiler::compile_for_node_adapter(&code, &options)
        .map_err(|error| Error::from_reason(error.to_string()))?;
    Ok(TransformResult {
        code: output.code,
        map: output.source_map,
    })
}

fn core_options(options: TransformOptions) -> Result<CompileOptions> {
    let module_name = options
        .module_name
        .ok_or_else(|| Error::from_reason("AST-native transform requires a `moduleName` option"))?;
    let generate = match options.generate.as_deref().unwrap_or("dom") {
        "dom" => Generate::Dom,
        "ssr" => Generate::Ssr,
        "universal" => Generate::Universal,
        "dynamic" => Generate::Dynamic,
        _ => {
            return Err(Error::from_reason(
                "The @dom-expressions/compiler backend implements DOM, SSR, universal, and dynamic modes only",
            ));
        }
    };
    Ok(CompileOptions {
        filename: options.filename,
        module_name,
        generate,
        hydratable: options.hydratable.unwrap_or(false),
        server_components: options.server_components.unwrap_or(false),
        dev: options.dev.unwrap_or(false),
        source_map: options.source_map.unwrap_or(false),
        context_to_custom_elements: options.context_to_custom_elements.unwrap_or(false),
        delegate_events: options.delegate_events.unwrap_or(true),
        delegated_events: options.delegated_events.unwrap_or_default(),
        omit_quotes: options.omit_quotes.unwrap_or(true),
        omit_attribute_spacing: options.omit_attribute_spacing.unwrap_or(true),
        inline_styles: options.inline_styles.unwrap_or(true),
        effect_wrapper: wrapper(options.effect_wrapper),
        wrap_conditionals: options.wrap_conditionals.unwrap_or(true),
        memo_wrapper: wrapper(options.memo_wrapper),
        static_marker: options.static_marker.unwrap_or_else(|| "@static".into()),
        require_import_source: options.require_import_source,
        validate: options.validate.unwrap_or(true),
        omit_nested_closing_tags: options.omit_nested_closing_tags.unwrap_or(false),
        omit_last_closing_tag: options.omit_last_closing_tag.unwrap_or(true),
        built_ins: options.built_ins.unwrap_or_default(),
        renderers: options
            .renderers
            .unwrap_or_default()
            .into_iter()
            .map(|renderer| Renderer {
                name: renderer.name,
                module_name: renderer.module_name,
                elements: renderer.elements,
            })
            .collect(),
    })
}

fn supported_generate(generate: Option<&str>) -> bool {
    matches!(
        generate.unwrap_or("dom"),
        "dom" | "ssr" | "universal" | "dynamic"
    )
}

/// Preserve the Node transform's established parse/skip/module/generate error
/// ordering on the exceptional paths that cannot yet be represented by the
/// typed Rust options.
fn legacy_preflight(code: &str, options: &TransformOptions) -> Result<Option<TransformResult>> {
    let source_type = crate::config::source_type_for_filename(options.filename.as_deref())?;
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, code, source_type)
        .with_options(ParseOptions {
            preserve_parens: false,
            ..ParseOptions::default()
        })
        .parse();
    if let Some(error) = crate::shared::parser::first_parser_error(parsed.diagnostics) {
        return Err(Error::from_reason(error));
    }
    if let Some(lib) = options.require_import_source.as_deref() {
        let has_pragma = parsed.program.comments.iter().any(|comment| {
            let text = comment.content_span().source_text(code);
            let mut pieces = text.split("@jsxImportSource");
            pieces.next();
            matches!((pieces.next(), pieces.next()), (Some(rest), None) if rest.trim() == lib)
        });
        if !has_pragma {
            return Ok(Some(TransformResult {
                code: code.to_owned(),
                map: None,
            }));
        }
    }
    if options.module_name.is_none() {
        return Err(Error::from_reason(
            "AST-native transform requires a `moduleName` option",
        ));
    }
    if !supported_generate(options.generate.as_deref()) {
        return Err(Error::from_reason(
            "The @dom-expressions/compiler backend implements DOM, SSR, universal, and dynamic modes only",
        ));
    }
    Ok(None)
}

fn wrapper(option: Option<Either<bool, String>>) -> Wrapper {
    match option {
        None | Some(Either::A(true)) => Wrapper::Default,
        Some(Either::A(false)) => Wrapper::Disabled,
        Some(Either::B(name)) if name.is_empty() => Wrapper::Disabled,
        Some(Either::B(name)) => Wrapper::Name(name),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn require_import_source_skip_precedes_module_name_validation() {
        let source = "const view = <div />;".to_string();
        let result = transform(
            source.clone(),
            Some(TransformOptions {
                require_import_source: Some("expected-library".into()),
                ..TransformOptions::default()
            }),
        )
        .expect("a skipped file does not require a module name");

        assert_eq!(result.code, source);

        let matching = "/** @jsxImportSource expected-library */\nconst view = <div />;";
        let result = transform(
            matching.into(),
            Some(TransformOptions {
                require_import_source: Some("expected-library".into()),
                ..TransformOptions::default()
            }),
        );
        let Err(error) = result else {
            panic!("a transformed file still requires a module name");
        };
        assert!(error
            .to_string()
            .contains("AST-native transform requires a `moduleName` option"));
    }

    #[test]
    fn legacy_validation_order_is_preserved() {
        let skipped = "const view = <div />;".to_string();
        let result = transform(
            skipped.clone(),
            Some(TransformOptions {
                generate: Some("invalid".into()),
                require_import_source: Some("expected-library".into()),
                ..TransformOptions::default()
            }),
        )
        .expect("requireImportSource skip precedes generate validation");
        assert_eq!(result.code, skipped);

        let result = transform(
            "const view = <div>".into(),
            Some(TransformOptions {
                module_name: Some("dom".into()),
                generate: Some("invalid".into()),
                ..TransformOptions::default()
            }),
        );
        let Err(error) = result else {
            panic!("invalid syntax should fail before generate validation");
        };
        assert!(!error.to_string().contains("implements DOM"));
    }

    #[test]
    fn explicit_empty_module_name_remains_accepted() {
        transform(
            "const view = <div />;".into(),
            Some(TransformOptions {
                module_name: Some(String::new()),
                ..TransformOptions::default()
            }),
        )
        .expect("next accepts an explicitly empty moduleName");
    }
}
