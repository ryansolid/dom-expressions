//! Public compiler-interface coverage without the Node/N-API adapter.
#![cfg(not(feature = "node"))]

use dom_expressions_compiler::{
    CompileErrorKind, CompileOptions, ExecutionSiteKind, Generate, TerminalDecision, ValueDecision,
    compile,
};

#[test]
fn compiles_through_the_public_rust_interface() {
    let output = compile(
        "const view = <div>{signal()}</div>;",
        &CompileOptions::default(),
    )
    .expect("compile through the public Rust interface");

    assert!(output.code.contains("template("));
    assert!(output.code.contains("insert("));
}
#[test]
fn supports_every_generate_mode_without_node_types() {
    for generate in [
        Generate::Dom,
        Generate::Ssr,
        Generate::Universal,
        Generate::Dynamic,
    ] {
        compile(
            "const view = <div />;",
            &CompileOptions {
                generate,
                ..CompileOptions::default()
            },
        )
        .unwrap_or_else(|error| panic!("{generate:?}: {error}"));
    }
}

#[test]
fn returns_owned_source_maps_and_typed_errors() {
    let output = compile(
        "const view = <div />;",
        &CompileOptions {
            source_map: true,
            ..CompileOptions::default()
        },
    )
    .expect("compile with a source map");
    assert!(output.source_map.is_some());

    let parse = compile("const view = <", &CompileOptions::default()).unwrap_err();
    assert_eq!(parse.kind(), CompileErrorKind::Parse);

    let configuration = compile(
        "const view = <div />;",
        &CompileOptions {
            module_name: String::new(),
            ..CompileOptions::default()
        },
    )
    .unwrap_err();
    assert_eq!(configuration.kind(), CompileErrorKind::Configuration);
}

fn traced(source: &str, inline_styles: bool) -> dom_expressions_compiler::SemanticTrace {
    compile(
        source,
        &CompileOptions {
            semantic_trace: true,
            inline_styles,
            ..CompileOptions::default()
        },
    )
    .expect("semantic tracing should cover valid JSX")
    .semantic_trace
    .expect("semantic trace")
}

#[test]
fn public_core_returns_owned_code_and_typed_semantics() {
    let source = "const view = <div>{signal()}</div>;";
    let output = compile(
        source,
        &CompileOptions {
            semantic_trace: true,
            ..CompileOptions::default()
        },
    )
    .expect("compile through the public Rust interface");

    assert!(output.code.contains("insert"));
    let trace = output.semantic_trace.expect("semantic trace");
    assert_eq!(trace.sites.len(), 1);
    assert_eq!(trace.sites[0].kind, ExecutionSiteKind::JsxChild);
    assert_eq!(
        trace.sites[0].decision,
        TerminalDecision::Value(ValueDecision::ReactiveRerun)
    );
    assert_eq!(
        &source[trace.sites[0].span.start as usize..trace.sites[0].span.end as usize],
        "signal()"
    );
}

#[test]
fn public_core_rejects_an_empty_module_name() {
    let result = compile(
        "const view = <div />;",
        &CompileOptions {
            module_name: String::new(),
            ..CompileOptions::default()
        },
    );

    assert!(
        result
            .unwrap_err()
            .to_string()
            .contains("non-empty module name")
    );
}

#[test]
fn style_and_class_sites_follow_the_lowering_shape() {
    for (source, expected_kind, expected_text) in [
        (
            "const view = <Foo style={{ color: signal() }} />;",
            ExecutionSiteKind::ComponentProperty,
            "{ color: signal() }",
        ),
        (
            "const view = <Foo class={{ active: signal() }} />;",
            ExecutionSiteKind::ComponentProperty,
            "{ active: signal() }",
        ),
        (
            "const view = <Foo {...p} style={{ color: signal() }} />;",
            ExecutionSiteKind::ComponentProperty,
            "{ color: signal() }",
        ),
        (
            "const view = <div {...p} style={{ color: signal() }} />;",
            ExecutionSiteKind::NativeAttribute,
            "{ color: signal() }",
        ),
    ] {
        let trace = traced(source, true);
        assert!(trace.sites.iter().any(|site| {
            site.kind == expected_kind
                && &source[site.span.start as usize..site.span.end as usize] == expected_text
        }));
    }
}

#[test]
fn inline_object_literals_are_not_execution_sites() {
    for source in [
        "const view = <div style={{ color: 'red', margin: 0 }} />;",
        "const view = <div class={{ active: true }} />;",
    ] {
        let trace = traced(source, true);
        assert!(trace.sites.is_empty(), "unexpected site for {source}");
    }

    for source in [
        "const view = <div style={{ color: 'red', width: signal() }} />;",
        "const view = <div class={{ active: true, pending: signal() }} />;",
    ] {
        let trace = traced(source, true);
        assert_eq!(trace.sites.len(), 1);
        let site = trace.sites[0];
        assert_eq!(site.kind, ExecutionSiteKind::NativeAttribute);
        assert_eq!(
            site.decision,
            TerminalDecision::Value(ValueDecision::ReactiveRerun)
        );
        assert_eq!(
            &source[site.span.start as usize..site.span.end as usize],
            "signal()"
        );
    }
}

#[test]
fn folded_source_expressions_remain_explicitly_elided() {
    let source = "const color = 'red'; const view = <div style={{ color }} />;";
    let trace = traced(source, true);
    assert_eq!(trace.sites.len(), 1);
    assert_eq!(
        trace.sites[0].decision,
        TerminalDecision::Value(ValueDecision::Elided)
    );
    assert_eq!(
        &source[trace.sites[0].span.start as usize..trace.sites[0].span.end as usize],
        "color"
    );
}

#[test]
fn non_fixed_style_objects_have_one_total_whole_object_site() {
    for (source, expected_text) in [
        (
            "const view = <div style={{ ...base, color: 'red' }} />;",
            "{ ...base, color: 'red' }",
        ),
        (
            "const view = <div style={{ color: 'red', ...overrides }} />;",
            "{ color: 'red', ...overrides }",
        ),
        (
            "const view = <div style={{ [key]: signal(), color: 'red' }} />;",
            "{ [key]: signal(), color: 'red' }",
        ),
    ] {
        let trace = traced(source, true);
        assert_eq!(trace.sites.len(), 1);
        let site = trace.sites[0];
        assert_eq!(site.kind, ExecutionSiteKind::NativeAttribute);
        assert_eq!(
            site.decision,
            TerminalDecision::Value(ValueDecision::ReactiveRerun)
        );
        assert_eq!(
            &source[site.span.start as usize..site.span.end as usize],
            expected_text
        );
    }
}

#[test]
fn no_inline_style_reports_the_original_expression() {
    for (source, expected_text, expected_decision) in [
        (
            "const view = <div style={{ color: signal() }} />;",
            "{ color: signal() }",
            ValueDecision::ReactiveRerun,
        ),
        (
            "const view = <div {...props} style={getStyles()} />;",
            "getStyles()",
            ValueDecision::CallerContext,
        ),
    ] {
        let trace = traced(source, false);
        assert!(trace.sites.iter().any(|site| {
            site.kind == ExecutionSiteKind::NativeAttribute
                && site.decision == TerminalDecision::Value(expected_decision)
                && &source[site.span.start as usize..site.span.end as usize] == expected_text
        }));
    }
}

#[test]
fn semantic_tracing_does_not_change_code_or_source_maps() {
    let source = "const view = <div style={{ color: signal() }} />;";
    let compile_with_trace = |semantic_trace| {
        compile(
            source,
            &CompileOptions {
                semantic_trace,
                inline_styles: false,
                source_map: true,
                ..CompileOptions::default()
            },
        )
        .expect("compile no-inline style with a source map")
    };

    let ordinary = compile_with_trace(false);
    let traced = compile_with_trace(true);
    assert_eq!(
        ordinary.source_map.as_deref(),
        Some(
            r#"{"version":3,"names":["style={{ color: signal() }}","<div style={{ color: signal() }} />"],"sources":["input.jsx"],"sourcesContent":["const view = <div style={{ color: signal() }} />;"],"mappings":";;;;AAAa,kBAAkC;AAA7BA;QAAO,EAAE,OAAO,OAAO,EAAE;AAAC,IAA1B;uBAA0B;;AAA5C,MAAM,OAAOC"}"#,
        )
    );
    assert_eq!(traced.code, ordinary.code);
    assert_eq!(traced.source_map, ordinary.source_map);
}

#[test]
fn static_string_attributes_are_not_execution_sites() {
    for (source, inline_styles) in [
        ("const view = <div innerHTML=\"x\" />;", true),
        ("const view = <div textContent=\"y\" />;", true),
        ("const view = <div prop:foo=\"bar\" />;", true),
        ("const view = <div style=\"color:red\" />;", false),
    ] {
        let trace = traced(source, inline_styles);
        assert!(trace.sites.is_empty(), "unexpected site for {source}");
    }
}

#[test]
fn literal_expression_containers_are_not_execution_sites() {
    for source in [
        "const view = <div title={42} />;",
        "const view = <div>{1}</div>;",
        "const view = <Widget value={true} />;",
        "const view = <button onClick={null} ref={undefined} />;",
        "const view = <textarea value={1} />;",
    ] {
        let trace = traced(source, true);
        assert!(trace.sites.is_empty(), "unexpected site for {source}");
    }
}

#[test]
fn trace_is_total_for_supported_attribute_rewrites() {
    for source in [
        r#"const view = <div class={{ "hover:bg": signal() }} />;"#,
        r#"const view = <div class={["a", { b: signal() }]} />;"#,
        r#"const view = <div style={{ [key]: signal(), width: other() }} />;"#,
        r#"const view = <textarea value={1} />;"#,
        r#"const view = <div {...props} children={ignored()}><span /></div>;"#,
        r#"const view = <div _hk={key()} />;"#,
        r#"const view = <svg xmlns={namespace()} />;"#,
    ] {
        traced(source, true);
    }
}

#[test]
fn spread_children_attribute_reports_only_the_execution_path_the_runtime_uses() {
    for (source, expected) in [
        (
            "const view = <div {...props} children={signal()} />;",
            ValueDecision::ReactiveRerun,
        ),
        (
            "const view = <section><div {...props} children={signal()} /></section>;",
            ValueDecision::ReactiveRerun,
        ),
        (
            "const view = <div {...props} children={signal()}>{other()}</div>;",
            ValueDecision::Elided,
        ),
    ] {
        let trace = traced(source, true);
        let sites = trace
            .sites
            .iter()
            .filter(|site| &source[site.span.start as usize..site.span.end as usize] == "signal()")
            .collect::<Vec<_>>();

        assert_eq!(sites.len(), 1, "unexpected signal sites for {source}");
        assert_eq!(sites[0].kind, ExecutionSiteKind::JsxChild);
        assert_eq!(
            sites[0].decision,
            TerminalDecision::Value(expected),
            "wrong children execution for {source}"
        );
    }
}
