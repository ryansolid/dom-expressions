//! Focused semantic-trace contract tests.
//!
//! The corpus census proves coverage at scale. These tests pin the producer
//! facts that the consumer must interpret: authoritative control-flow
//! classification, wrapper observations, shared effect groups, component
//! render sites, and deferred callback receiver spans.
#![cfg(not(feature = "node"))]

use dom_expressions_compiler::{
    CallbackDecision, CompileOptions, ExecutionSiteKind, SemanticTrace, TerminalDecision,
    ValueDecision, Wrapper, compile,
};

fn options(semantic_trace: bool) -> CompileOptions {
    CompileOptions {
        module_name: "r-dom".into(),
        built_ins: vec!["For".into(), "Show".into()],
        static_marker: "@once".into(),
        semantic_trace,
        ..CompileOptions::default()
    }
}

fn trace(source: &str) -> SemanticTrace {
    compile(source, &options(true))
        .expect("compile with semantic tracing")
        .semantic_trace
        .expect("semantic trace")
}

fn source_text(source: &str, start: u32, end: u32) -> &str {
    &source[start as usize..end as usize]
}

#[test]
fn control_flow_render_is_authoritative_and_requires_configuration() {
    let source = r#"const C = () => <Show>{() => <span>{value()}</span>}</Show>;"#;
    let configured = trace(source);
    assert!(
        configured
            .sites
            .contains(&dom_expressions_compiler::ExecutionSite {
                span: configured
                    .sites
                    .iter()
                    .find(|site| source_text(source, site.span.start, site.span.end)
                        == "() => <span>{value()}</span>")
                    .expect("function child site")
                    .span,
                kind: ExecutionSiteKind::ControlFlowRender,
                decision: TerminalDecision::Callback(CallbackDecision::LaterRender),
            })
    );

    let unconfigured = compile(
        source,
        &CompileOptions {
            built_ins: Vec::new(),
            ..options(true)
        },
    )
    .expect("compile unconfigured built-in")
    .semantic_trace
    .expect("semantic trace");
    assert!(unconfigured.sites.iter().any(|site| {
        source_text(source, site.span.start, site.span.end) == "() => <span>{value()}</span>"
            && site.kind == ExecutionSiteKind::ComponentChild
            && site.decision == TerminalDecision::Value(ValueDecision::EagerOnce)
    }));

    let shadowed_source = r#"const Show = Thing; const C = () => <Show>{() => value()}</Show>;"#;
    let shadowed = trace(shadowed_source);
    assert!(shadowed.sites.iter().any(|site| {
        source_text(shadowed_source, site.span.start, site.span.end) == "() => value()"
            && site.kind == ExecutionSiteKind::ComponentChild
    }));
}

#[test]
fn owner_facts_preserve_wrapper_identity_and_shared_effect_groups() {
    let source = r#"const C = (props) => <div title={props.title} id={props.id} />;"#;
    let rendered = trace(source);
    let effects = rendered
        .owner_establishments
        .iter()
        .filter(|fact| fact.wrapper == "effect")
        .map(|fact| {
            (
                source_text(source, fact.span.start, fact.span.end),
                fact.group_id,
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(effects, [("props.title", Some(0)), ("props.id", Some(0))]);

    let custom = compile(
        "const C = (props) => <div title={props.value} />;",
        &CompileOptions {
            effect_wrapper: Wrapper::Name("createRenderEffect".into()),
            ..options(true)
        },
    )
    .expect("compile custom effect wrapper")
    .semantic_trace
    .expect("semantic trace");
    assert!(custom.owner_establishments.iter().any(|fact| {
        fact.wrapper == "createRenderEffect"
            && source_text(
                "const C = (props) => <div title={props.value} />;",
                fact.span.start,
                fact.span.end,
            ) == "props.value"
    }));
}

#[test]
fn effect_facts_join_their_execution_site_spans() {
    for source in [
        "const C = (props) => <div title={props.title} />;",
        "const C = (props) => <div style={{ color: props.color }} />;",
        "const C = (props) => <div class={{ active: props.active }} />;",
    ] {
        let rendered = trace(source);
        let site_spans = rendered
            .sites
            .iter()
            .filter(|site| {
                site.kind == ExecutionSiteKind::NativeAttribute
                    && site.decision == TerminalDecision::Value(ValueDecision::ReactiveRerun)
            })
            .map(|site| source_text(source, site.span.start, site.span.end))
            .collect::<Vec<_>>();
        let effect_spans = rendered
            .owner_establishments
            .iter()
            .filter(|fact| fact.wrapper == "effect")
            .map(|fact| source_text(source, fact.span.start, fact.span.end))
            .collect::<Vec<_>>();
        assert_eq!(effect_spans, site_spans, "effect span drift for {source}");
    }
}

#[test]
fn owner_facts_cover_insert_events_refs_and_the_2_0_scope_wrapper() {
    let source = r#"const C = (props) => <div title={props.title} onClick={props.onClick} ref={props.ref}>{props.child}</div>;"#;
    let rendered = trace(source);
    let facts = rendered
        .owner_establishments
        .iter()
        .map(|fact| {
            (
                fact.wrapper.as_str(),
                source_text(source, fact.span.start, fact.span.end),
            )
        })
        .collect::<Vec<_>>();
    for expected in [
        ("effect", "props.title"),
        ("insert", "props.child"),
        ("delegated", "props.onClick"),
        ("ref-apply", "props.ref"),
    ] {
        assert!(facts.contains(&expected), "missing owner fact {expected:?}");
    }

    let hydration_source = "const C = (props) => <div>{props.child()}</div>;";
    let hydration = compile(
        hydration_source,
        &CompileOptions {
            hydratable: true,
            ..options(true)
        },
    )
    .expect("compile hydratable source")
    .semantic_trace
    .expect("semantic trace");
    // The scope wrapper is emitted around the JSX container but recorded at
    // the wrapped expression, exactly like the `insert` fact beside it.
    assert_eq!(
        hydration
            .owner_establishments
            .iter()
            .filter(|fact| fact.wrapper == "scope")
            .map(|fact| source_text(hydration_source, fact.span.start, fact.span.end))
            .collect::<Vec<_>>(),
        ["props.child()"]
    );
}

/// Every wrapper fact has to land on a span the consumer can find again: an
/// `ExecutionSite` for an expression, a `ComponentRenderSite` or
/// `DeferredCallbackSite` for a JSX node. The join is by containment, because
/// a conditional's memo is spanned at the test it memoizes and is a strict
/// sub-span of its site; every other identity joins by equality. The
/// fragment-child and hydration-scope paths are here because both used to
/// report the JSX expression container, braces included, which joins nothing
/// under either rule.
#[test]
fn owner_facts_join_a_site_or_jsx_node_span() {
    for (source, hydratable) in [
        ("const C = (p) => <div>{p.a()}</div>;", true),
        ("const C = (p) => <><div/>{p.a ? p.b : p.c}</>;", false),
        ("const C = (p) => <><div/>{p.a ? p.b : p.c}</>;", true),
        ("const C = (p) => <>{...p.items}</>;", true),
        (
            "const C = (p) => <div><span/>{p.a ? p.b : p.c}<span/></div>;",
            false,
        ),
        (
            "const C = (p) => <div title={p.t} onClick={p.c} ref={p.r}>{p.child}</div>;",
            true,
        ),
        (
            "const C = (p) => <Thing prop={p.v}>{p.child}</Thing>;",
            true,
        ),
    ] {
        let rendered = compile(
            source,
            &CompileOptions {
                hydratable,
                ..options(true)
            },
        )
        .expect("compile")
        .semantic_trace
        .expect("semantic trace");
        let joinable = rendered
            .sites
            .iter()
            .map(|site| site.span)
            .chain(rendered.component_render_sites.iter().map(|fact| fact.span))
            .chain(
                rendered
                    .deferred_callback_sites
                    .iter()
                    .map(|fact| fact.span),
            )
            .collect::<Vec<_>>();
        let orphans = rendered
            .owner_establishments
            .iter()
            .filter(|fact| {
                !joinable
                    .iter()
                    .any(|span| span.start <= fact.span.start && fact.span.end <= span.end)
            })
            .map(|fact| {
                (
                    fact.wrapper.as_str(),
                    source_text(source, fact.span.start, fact.span.end),
                )
            })
            .collect::<Vec<_>>();
        assert!(
            orphans.is_empty(),
            "unjoinable facts for {source} (hydratable={hydratable}): {orphans:?}"
        );
        // Only memo may be a strict sub-span; every other identity is exactly
        // its site.
        let equality = joinable
            .iter()
            .copied()
            .collect::<std::collections::BTreeSet<_>>();
        let inexact = rendered
            .owner_establishments
            .iter()
            .filter(|fact| fact.wrapper != "memo" && !equality.contains(&fact.span))
            .map(|fact| {
                (
                    fact.wrapper.as_str(),
                    source_text(source, fact.span.start, fact.span.end),
                )
            })
            .collect::<Vec<_>>();
        assert!(
            inexact.is_empty(),
            "non-memo facts that do not equality-join for {source} (hydratable={hydratable}): {inexact:?}"
        );
        assert!(
            !rendered.owner_establishments.is_empty(),
            "no facts at all for {source}"
        );
    }
}

/// Every memo fact as `(start, end, source text)`, in report order.
fn memos(source: &str) -> Vec<(u32, u32, &str)> {
    trace(source)
        .owner_establishments
        .into_iter()
        .filter(|fact| fact.wrapper == "memo")
        .map(|fact| {
            (
                fact.span.start,
                fact.span.end,
                source_text(source, fact.span.start, fact.span.end),
            )
        })
        .collect::<Vec<_>>()
}

/// The emitted `memo(...)` calls, which every memo fact must correspond to
/// one-for-one.
fn emitted_memo_count(source: &str) -> usize {
    compile(source, &options(true))
        .expect("compile with semantic tracing")
        .code
        .matches("_$memo(")
        .count()
}

#[test]
fn condition_memo_facts_span_the_booleanized_test_one_per_emission() {
    // The memo wraps `!!value()`; `left()` and `right()` run in the insert's
    // or child getter's scope, not inside the memo, so the fact covers the
    // test alone and is a strict sub-span of the site.
    for (source, expected) in [
        (
            "const C = () => <Show>{value() ? left() : right()}</Show>;",
            (23, 30, "value()"),
        ),
        (
            "const C = () => <div>{value() ? left() : right()}</div>;",
            (22, 29, "value()"),
        ),
        (
            "const C = () => <div><span/>{value() ? left() : right()}<span/></div>;",
            (29, 36, "value()"),
        ),
        // `left && right` memoizes the booleanized left operand only.
        (
            "const C = () => <div>{cond() && x()}</div>;",
            (22, 28, "cond()"),
        ),
    ] {
        assert_eq!(memos(source), [expected], "memo facts for {source}");
        assert_eq!(emitted_memo_count(source), 1, "memo emissions for {source}");
    }
}

#[test]
fn nested_condition_memos_are_reported_one_per_memo() {
    // Two tests are memoized (`!!x()` and `!!y()`), so two facts exist. A
    // fact spanning the whole conditional would collapse them into one and
    // would also claim the branches are memoized, which they are not.
    let source = "const C = () => <div>{x() ? (y() ? a() : b()) : c()}</div>;";
    assert_eq!(memos(source), [(22, 25, "x()"), (29, 32, "y()")]);
    assert_eq!(emitted_memo_count(source), 2);
}

#[test]
fn a_fragment_child_condition_memo_is_brace_free_and_one_fact_per_memo() {
    // The path that reaches `transform_condition_inline` through
    // `dynamic_child_thunk`. Two memos are emitted — the condition test and
    // the fragment child's own thunk wrapper — and each is reported at its
    // own span. Neither covers `{`…`}`.
    let source = "const C = () => <><div/>{value() ? left() : right()}</>;";
    assert_eq!(
        memos(source),
        [(25, 32, "value()"), (25, 51, "value() ? left() : right()")]
    );
    assert_eq!(emitted_memo_count(source), 2);

    // A fragment spread child is memo-wrapped at the spread's expression.
    let spread = "const C = (p) => <>{...p.items}</>;";
    assert_eq!(memos(spread), [(23, 30, "p.items")]);
    assert_eq!(emitted_memo_count(spread), 1);
}

#[test]
fn component_render_and_deferred_callback_facts_are_spans_only() {
    let source =
        r#"const C = (props) => <Thing label={props.label} ref={props.ref} {...props.data} />;"#;
    let rendered = trace(source);
    assert_eq!(
        rendered
            .component_render_sites
            .iter()
            .map(|fact| source_text(source, fact.span.start, fact.span.end))
            .collect::<Vec<_>>(),
        ["<Thing label={props.label} ref={props.ref} {...props.data} />"]
    );
    let callbacks = rendered
        .deferred_callback_sites
        .iter()
        .map(|fact| {
            (
                source_text(source, fact.span.start, fact.span.end),
                source_text(source, fact.receiver_span.start, fact.receiver_span.end),
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(
        callbacks,
        [
            (
                "props.label",
                "<Thing label={props.label} ref={props.ref} {...props.data} />",
            ),
            (
                "props.ref",
                "<Thing label={props.label} ref={props.ref} {...props.data} />",
            ),
            (
                "props.data",
                "<Thing label={props.label} ref={props.ref} {...props.data} />",
            ),
        ]
    );
}

#[test]
fn disabled_wrappers_do_not_invent_wrapper_facts() {
    let source = "const C = (props) => <div title={props.title}>{props.child}</div>;";
    let rendered = compile(
        source,
        &CompileOptions {
            effect_wrapper: Wrapper::Disabled,
            memo_wrapper: Wrapper::Disabled,
            ..options(true)
        },
    )
    .expect("compile with disabled wrappers")
    .semantic_trace
    .expect("semantic trace");
    assert!(
        rendered
            .owner_establishments
            .iter()
            .all(|fact| fact.wrapper != "effect" && fact.wrapper != "memo")
    );
}
