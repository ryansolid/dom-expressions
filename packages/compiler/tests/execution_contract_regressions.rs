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

/// A void element's child list is dropped by the parity-target Babel plugin in
/// every position; this fork's `lower_dynamic_native_child` keeps it in *nested*
/// native-child position and emits a real reactive `insert` into the void
/// element (divergence 1 in docs/execution-contract.md, still open and out of
/// scope for this test). Either way the census and lowering must
/// agree: the nested shape reports the site it emits, the template-root shapes
/// report nothing, and no file fails reconciliation.
#[test]
fn void_element_children_reconcile_in_every_position() {
    let nested = "const el = <div><br>{x()}</br></div>;";
    let rendered = trace(nested);
    assert_eq!(
        rendered
            .sites
            .iter()
            .map(|site| (
                source_text(nested, site.span.start, site.span.end),
                site.kind,
                site.decision
            ))
            .collect::<Vec<_>>(),
        [(
            "x()",
            ExecutionSiteKind::JsxChild,
            TerminalDecision::Value(ValueDecision::ReactiveRerun)
        )],
        "a nested void element's lowered child must be censused and decided"
    );
    assert_eq!(
        rendered
            .ownership_sites
            .iter()
            .map(|site| source_text(nested, site.span.start, site.span.end))
            .collect::<Vec<_>>(),
        ["x()"]
    );

    // Every other position makes the void element its own template root, where
    // `lower_dom_element` discards the child list without emitting anything.
    // The discarded child list is the source range between the void element's
    // `>` and its closing tag; nothing inside it may claim a site. (An
    // attribute-position void element still has its own attribute-value site
    // for the whole JSX expression, which is why this checks the range rather
    // than emptiness.)
    for (source, discarded) in [
        ("const el = <br>{x()}</br>;", "{x()}"),
        ("const el = <><br>{x()}</br></>;", "{x()}"),
        ("const el = <Comp><br>{x()}</br></Comp>;", "{x()}"),
        ("const el = <div a={<br>{x()}</br>} />;", "{x()}"),
        (
            "const el = <br><span class={x()}>{y()}</span></br>;",
            "<span class={x()}>{y()}</span>",
        ),
        ("const el = <br>{...x}</br>;", "{...x}"),
    ] {
        let start = source.find(discarded).expect("discarded range") as u32;
        let end = start + discarded.len() as u32;
        let rendered = trace(source);
        let inside = rendered
            .sites
            .iter()
            .filter(|site| site.span.start >= start && site.span.end <= end)
            .collect::<Vec<_>>();
        assert!(
            inside.is_empty(),
            "{source}: a discarded void child list must claim no site, got {inside:?}"
        );
        assert!(
            rendered
                .ownership_sites
                .iter()
                .all(|site| site.span.start < start || site.span.end > end),
            "{source}: a discarded void child list must claim no ownership site"
        );
    }

    // `children` on a void element is never promoted to a child insert —
    // `lower_dom_element` gates the capture on `!is_void_element`, and like
    // Babel it emits nothing — so it stays an attribute site resolved as data.
    for source in [
        "const el = <br children={x()} />;",
        "const el = <div><br children={x()} /></div>;",
    ] {
        let rendered = trace(source);
        assert_eq!(
            rendered
                .sites
                .iter()
                .map(|site| (
                    source_text(source, site.span.start, site.span.end),
                    site.kind,
                    site.decision
                ))
                .collect::<Vec<_>>(),
            [(
                "x()",
                ExecutionSiteKind::NativeAttribute,
                TerminalDecision::Value(ValueDecision::Elided)
            )],
            "{source}: a void `children` attribute is not a child insert"
        );
    }

    // A void element's *attributes* are not children: they lower in both
    // positions and must keep their sites.
    for source in [
        "const el = <div><br class={x()} /></div>;",
        "const el = <br class={x()} />;",
        "const el = <div><br class={x()}>{y()}</br></div>;",
    ] {
        let rendered = trace(source);
        assert!(
            rendered.sites.iter().any(|site| {
                source_text(source, site.span.start, site.span.end) == "x()"
                    && site.kind == ExecutionSiteKind::NativeAttribute
                    && site.decision == TerminalDecision::Value(ValueDecision::ReactiveRerun)
            }),
            "{source}: a void element's attribute site must survive, got {:?}",
            rendered.sites
        );
    }
}

/// A void element must not perturb its siblings' or a plain element's facts.
#[test]
fn void_children_leave_neighbouring_facts_untouched() {
    let source = "const el = <div><br>{x()}</br><span>{y()}</span></div>;";
    let rendered = trace(source);
    assert_eq!(
        rendered
            .sites
            .iter()
            .map(|site| (
                source_text(source, site.span.start, site.span.end),
                site.kind,
                site.decision
            ))
            .collect::<Vec<_>>(),
        [
            (
                "x()",
                ExecutionSiteKind::JsxChild,
                TerminalDecision::Value(ValueDecision::ReactiveRerun)
            ),
            (
                "y()",
                ExecutionSiteKind::JsxChild,
                TerminalDecision::Value(ValueDecision::ReactiveRerun)
            ),
        ]
    );

    let plain = "const el = <div><span>{y()}</span></div>;";
    let rendered = trace(plain);
    assert_eq!(
        rendered
            .sites
            .iter()
            .map(|site| (
                source_text(plain, site.span.start, site.span.end),
                site.kind,
                site.decision
            ))
            .collect::<Vec<_>>(),
        [(
            "y()",
            ExecutionSiteKind::JsxChild,
            TerminalDecision::Value(ValueDecision::ReactiveRerun)
        )]
    );
    assert_eq!(
        rendered
            .ownership_sites
            .iter()
            .map(|site| source_text(plain, site.span.start, site.span.end))
            .collect::<Vec<_>>(),
        ["y()"]
    );
}

/// A nested element whose dynamic `textContent` replaces its content discards
/// the source child list unlowered. (The template-root path in `element.rs`
/// reaches *its* placeholder branch only when the element has no children of
/// its own, so that branch discards nothing.) The discarded children must claim
/// no site.
#[test]
fn dynamic_text_content_retracts_the_children_it_discards() {
    for source in [
        "const el = <div><span textContent={x()}>{y()}</span></div>;",
        "const el = <div><br textContent={x()}>{y()}</br></div>;",
        // The retraction prunes *every* site kind inside the discarded subtree,
        // not just the value sites of a flat child list: a ref and an event
        // handler nested under it are equally unemitted.
        "const el = <div><span textContent={x()}><div ref={r} onClick={h}>{y()}</div></span></div>;",
    ] {
        let rendered = trace(source);
        assert_eq!(
            rendered
                .sites
                .iter()
                .map(|site| (
                    source_text(source, site.span.start, site.span.end),
                    site.kind
                ))
                .collect::<Vec<_>>(),
            [("x()", ExecutionSiteKind::NativeAttribute)],
            "{source}: only the textContent attribute survives"
        );
    }
}

/// Babel's textarea `value` fold (`path.node.children = [child]`) discards the
/// element's source children on every path that performs it — the nested
/// native-child lowering, the template root, and the static-template fast path,
/// which the fold can make static *because* the dynamic source children are
/// dropped. Babel discards them too (`<div><textarea value="lit">{y()}</textarea></div>`
/// compiles to a bare `_$template("<div><textarea>lit")` with no insert), so
/// retracting their censused sites is parity-clean. The fold's replacement is
/// not a source expression and claims no site of its own.
#[test]
fn textarea_value_fold_reconciles_the_children_it_discards() {
    for (source, discarded) in [
        // Nested native-child position (`lower_dynamic_native_child`).
        (
            "const el = <div><textarea value=\"lit\">{y()}</textarea></div>;",
            "{y()}",
        ),
        (
            "const el = <div><textarea value={\"lit\"}>{y()}</textarea></div>;",
            "{y()}",
        ),
        (
            "const el = <div><textarea value={1}>{y()}</textarea></div>;",
            "{y()}",
        ),
        // Template root (`lower_dom_element`).
        (
            "const el = <textarea value=\"lit\">{y()}</textarea>;",
            "{y()}",
        ),
        (
            "const el = <textarea value={\"lit\"}>{y()}</textarea>;",
            "{y()}",
        ),
        // Fragment, component and attribute positions all reach the template
        // root through their own wrappers.
        (
            "const el = <><textarea value=\"lit\">{y()}</textarea></>;",
            "{y()}",
        ),
        (
            "const el = <Comp><textarea value=\"lit\">{y()}</textarea></Comp>;",
            "{y()}",
        ),
        (
            "const el = <div a={<textarea value=\"lit\">{y()}</textarea>} />;",
            "{y()}",
        ),
        // Static-template fast path (`lower_static_native_template`): the whole
        // subtree inlines because the fold dropped the dynamic child.
        (
            "const el = <div><p><textarea value=\"lit\">{y()}</textarea></p></div>;",
            "{y()}",
        ),
        // The retraction prunes every site kind in the discarded subtree.
        (
            "const el = <textarea value=\"lit\"><span ref={r} onClick={h}>{y()}</span></textarea>;",
            "<span ref={r} onClick={h}>{y()}</span>",
        ),
        (
            "const el = <div><textarea value=\"lit\"><span onClick={h}>{y()}</span></textarea></div>;",
            "<span onClick={h}>{y()}</span>",
        ),
    ] {
        let start = source.find(discarded).expect("discarded range") as u32;
        let end = start + discarded.len() as u32;
        let rendered = trace(source);
        let inside = rendered
            .sites
            .iter()
            .filter(|site| site.span.start >= start && site.span.end <= end)
            .collect::<Vec<_>>();
        assert!(
            inside.is_empty(),
            "{source}: a folded-away child list must claim no site, got {inside:?}"
        );
        assert!(
            rendered
                .ownership_sites
                .iter()
                .all(|site| site.span.start < start || site.span.end > end),
            "{source}: a folded-away child list must claim no ownership site"
        );
    }

    // A valueless `value` folds to a synthesized `{true}` spanned at the
    // attribute, which really is inserted. It is not a source expression, so it
    // is not a site — but the `insert` the lowering emits is still reported,
    // joining to nothing exactly as a literal-only source hole's does.
    for (source, attribute) in [
        (
            "const el = <div><textarea value>{y()}</textarea></div>;",
            "value",
        ),
        ("const el = <textarea value>{y()}</textarea>;", "value"),
    ] {
        let rendered = trace(source);
        assert!(
            rendered.sites.is_empty(),
            "{source}: neither the discarded child nor the synthesized one is a site, got {:?}",
            rendered.sites
        );
        let start = source.find(attribute).expect("attribute span") as u32;
        assert!(
            rendered.owner_establishments.iter().any(|fact| {
                fact.wrapper == "insert"
                    && fact.span.start == start
                    && fact.span.end == start + attribute.len() as u32
            }),
            "{source}: the emitted insert is still reported, got {:?}",
            rendered.owner_establishments
        );
    }

    // The fold touches only the child list: sibling children and the element's
    // own other attributes keep their sites.
    let source = "const el = <div><textarea value=\"lit\" class={c()}>{y()}</textarea><span>{z()}</span></div>;";
    let rendered = trace(source);
    assert_eq!(
        rendered
            .sites
            .iter()
            .map(|site| (
                source_text(source, site.span.start, site.span.end),
                site.kind,
                site.decision
            ))
            .collect::<Vec<_>>(),
        [
            (
                "c()",
                ExecutionSiteKind::NativeAttribute,
                TerminalDecision::Value(ValueDecision::ReactiveRerun)
            ),
            (
                "z()",
                ExecutionSiteKind::JsxChild,
                TerminalDecision::Value(ValueDecision::ReactiveRerun)
            ),
        ]
    );
}

/// `<noscript>` markup is inert: the static-template fast path emits the tag
/// and returns without visiting the children, and Babel drops them too. The
/// discarded children must claim no site — but a `<noscript>` whose attributes
/// force the dynamic path, and one that is its own template root (a bare root
/// or a fragment child), do lower their children and keep their sites (those
/// diverge from Babel, which emits no insert in any position; the trace reports
/// what this compiler emits).
#[test]
fn inert_noscript_children_reconcile_in_every_position() {
    for (source, discarded) in [
        ("const el = <div><noscript>{x()}</noscript></div>;", "{x()}"),
        (
            "const el = <div><noscript><span onClick={h}>{y()}</span></noscript></div>;",
            "<span onClick={h}>{y()}</span>",
        ),
        // The outer element bails out of the fast path because of the dynamic
        // sibling, so the `<noscript>` is re-visited on the fallback path; the
        // retraction must survive that.
        (
            "const el = <div><noscript>{x()}</noscript><b>{z()}</b></div>;",
            "{x()}",
        ),
    ] {
        let start = source.find(discarded).expect("discarded range") as u32;
        let end = start + discarded.len() as u32;
        let rendered = trace(source);
        let inside = rendered
            .sites
            .iter()
            .filter(|site| site.span.start >= start && site.span.end <= end)
            .collect::<Vec<_>>();
        assert!(
            inside.is_empty(),
            "{source}: an inert `<noscript>` child list must claim no site, got {inside:?}"
        );
    }

    // Attributes that force the dynamic path, and every template-root position
    // (bare root, fragment child), all lower the children — so the sites stay.
    for source in [
        "const el = <div><noscript class={c()}>{x()}</noscript></div>;",
        "const el = <noscript>{x()}</noscript>;",
        "const el = <><noscript>{x()}</noscript></>;",
    ] {
        let rendered = trace(source);
        assert!(
            rendered.sites.iter().any(|site| {
                source_text(source, site.span.start, site.span.end) == "x()"
                    && site.kind == ExecutionSiteKind::JsxChild
                    && site.decision == TerminalDecision::Value(ValueDecision::ReactiveRerun)
            }),
            "{source}: a lowered `<noscript>` child keeps its site, got {:?}",
            rendered.sites
        );
    }
}

/// Upstream `bba3db6c` makes a non-literal `children` attribute
/// child content. Template roots and nested elements that take the dynamic
/// lowering path promote it to an insert. The fork's existing nested static
/// fast path still skips that promotion, so its trace truthfully reports the
/// value as elided until that separate transform divergence is fixed.
#[test]
fn native_children_trace_matches_the_selected_lowering_path() {
    // A template root promotes the value to an ordinary reactive child and
    // reports the emitted insert at the source expression.
    for source in ["const el = <span children={x()} />;"] {
        let rendered = trace(source);
        assert!(
            rendered.sites.iter().any(|site| {
                source_text(source, site.span.start, site.span.end) == "x()"
                    && site.kind == ExecutionSiteKind::JsxChild
                    && site.decision == TerminalDecision::Value(ValueDecision::ReactiveRerun)
            }),
            "{source}: the promoted `children` value is a reactive JSX child, got {:?}",
            rendered.sites
        );
        assert!(
            rendered.owner_establishments.iter().any(|fact| {
                fact.wrapper == "insert"
                    && source_text(source, fact.span.start, fact.span.end) == "x()"
            }),
            "{source}: the emitted insert is reported at the promoted value, got {:?}",
            rendered.owner_establishments
        );
    }

    // A nested element that the parent folds into its static template never
    // reaches nested dynamic lowering. Current transform output drops the
    // value, so the trace records one elided JSX-child decision and no insert.
    for source in [
        "const el = <div><span children={x()} /></div>;",
        "const el = <div><section><span children={x()} /></section></div>;",
        "const el = <Comp><div><span children={x()} /></div></Comp>;",
    ] {
        let rendered = trace(source);
        assert!(
            rendered.sites.iter().any(|site| {
                source_text(source, site.span.start, site.span.end) == "x()"
                    && site.kind == ExecutionSiteKind::JsxChild
                    && site.decision == TerminalDecision::Value(ValueDecision::Elided)
            }),
            "{source}: the nested static-path residue is elided, got {:?}",
            rendered.sites
        );
        assert!(
            rendered.owner_establishments.iter().all(|fact| source_text(
                source,
                fact.span.start,
                fact.span.end
            ) != "x()"),
            "{source}: the nested static-path residue emits no insert, got {:?}",
            rendered.owner_establishments
        );
    }

    // Dynamic attributes or callbacks force the nested element through full
    // lowering, where the promoted child does emit and owns an insert.
    for source in [
        "const el = <div><span id={id()} children={x()} /></div>;",
        "const el = <div><span ref={node} onClick={handler} children={x()} /></div>;",
    ] {
        let rendered = trace(source);
        assert!(
            rendered.sites.iter().any(|site| {
                source_text(source, site.span.start, site.span.end) == "x()"
                    && site.kind == ExecutionSiteKind::JsxChild
                    && site.decision == TerminalDecision::Value(ValueDecision::ReactiveRerun)
            }),
            "{source}: full nested lowering promotes the child, got {:?}",
            rendered.sites
        );
        assert!(
            rendered.owner_establishments.iter().any(|fact| {
                fact.wrapper == "insert"
                    && source_text(source, fact.span.start, fact.span.end) == "x()"
            }),
            "{source}: full nested lowering reports the insert, got {:?}",
            rendered.owner_establishments
        );
    }

    // Babel writes one `children` slot per element, and the last writer wins:
    // a dynamic `textContent` overwrites the captured attribute value with its
    // synthesized text node, so a `children` attribute *before* it is
    // discarded, while one *after* it survives and takes the insert. The
    // textarea `value` fold fills the child list in preprocessing, so
    // `!hasChildren` blocks the push outright; and `<noscript>`'s child list is
    // pushed but never visited (`if (tagName !== "noscript")`). All three
    // discard the value unlowered, and Babel emits nothing for it either.
    for source in [
        "const el = <div><span children={x()} textContent={t()} /></div>;",
        "const el = <div><textarea value=\"lit\" children={x()} /></div>;",
        "const el = <div><noscript children={x()} /></div>;",
    ] {
        let rendered = trace(source);
        assert!(
            rendered.sites.iter().any(|site| {
                source_text(source, site.span.start, site.span.end) == "x()"
                    && site.kind == ExecutionSiteKind::JsxChild
                    && site.decision == TerminalDecision::Value(ValueDecision::Elided)
            }),
            "{source}: a discarded capture is decided as data, got {:?}",
            rendered.sites
        );
        assert!(
            rendered.owner_establishments.iter().all(|fact| source_text(
                source,
                fact.span.start,
                fact.span.end
            ) != "x()"),
            "{source}: a discarded capture emits nothing to own, got {:?}",
            rendered.owner_establishments
        );
    }

    // A `children` attribute *after* the dynamic `textContent` wins the slot:
    // both the attribute effect and the child insert are emitted.
    let source = "const el = <div><span textContent={t()} children={x()} /></div>;";
    let rendered = trace(source);
    assert_eq!(
        rendered
            .sites
            .iter()
            .map(|site| (
                source_text(source, site.span.start, site.span.end),
                site.kind,
                site.decision
            ))
            .collect::<Vec<_>>(),
        [
            (
                "t()",
                ExecutionSiteKind::NativeAttribute,
                TerminalDecision::Value(ValueDecision::ReactiveRerun)
            ),
            (
                "x()",
                ExecutionSiteKind::JsxChild,
                TerminalDecision::Value(ValueDecision::ReactiveRerun)
            ),
        ]
    );

    // Source children shadow the attribute in both positions: only they are
    // inserted, and the attribute stays a native-attribute site resolved as
    // data. (A void element's `children` attribute is covered by
    // `void_element_children_reconcile_in_every_position`.)
    for source in [
        "const el = <div><span children={x()}>{y()}</span></div>;",
        "const el = <span children={x()}>{y()}</span>;",
    ] {
        let rendered = trace(source);
        assert_eq!(
            rendered
                .sites
                .iter()
                .map(|site| (
                    source_text(source, site.span.start, site.span.end),
                    site.kind,
                    site.decision
                ))
                .collect::<Vec<_>>(),
            [
                (
                    "x()",
                    ExecutionSiteKind::NativeAttribute,
                    TerminalDecision::Value(ValueDecision::Elided)
                ),
                (
                    "y()",
                    ExecutionSiteKind::JsxChild,
                    TerminalDecision::Value(ValueDecision::ReactiveRerun)
                ),
            ],
            "{source}: source children shadow the attribute"
        );
    }

    // Duplicates resolve to the last `children` attribute. The shadowed one
    // claims nothing, and the surviving value follows the same nested static
    // fast-path residue as a single attribute.
    let source = "const el = <div><span children={x()} children={y()} /></div>;";
    let rendered = trace(source);
    assert_eq!(
        rendered
            .sites
            .iter()
            .map(|site| (
                source_text(source, site.span.start, site.span.end),
                site.kind,
                site.decision
            ))
            .collect::<Vec<_>>(),
        [(
            "y()",
            ExecutionSiteKind::JsxChild,
            TerminalDecision::Value(ValueDecision::Elided)
        )]
    );
}

/// Every shape whose child list a lowering path discards must compile
/// identically with tracing on and off. Reconciling the census is a
/// fact-side-channel change; it may not move a byte of `transform()` output.
#[test]
fn discarded_child_shapes_do_not_move_transform_output() {
    // Compare source maps for real: the shared `options()` leaves
    // `source_map: false`, which would make the assertion below `None == None`.
    let with_map = |semantic_trace: bool| CompileOptions {
        source_map: true,
        ..options(semantic_trace)
    };
    // One warm-up compile keeps Oxc's lazy source-map initialization out of
    // the comparison, as host_independent_interface.rs does.
    let _warmup = compile("const el = <div>{w()}</div>;", &with_map(false));
    for source in [
        "const el = <div><textarea value=\"lit\">{y()}</textarea></div>;",
        "const el = <div><textarea value>{y()}</textarea></div>;",
        "const el = <div><textarea value={1}>{y()}</textarea></div>;",
        "const el = <textarea value=\"lit\">{y()}</textarea>;",
        "const el = <textarea value>{y()}</textarea>;",
        "const el = <div><p><textarea value=\"lit\">{y()}</textarea></p></div>;",
        "const el = <><textarea value=\"lit\">{y()}</textarea></>;",
        "const el = <Comp><textarea value=\"lit\">{y()}</textarea></Comp>;",
        "const el = <div a={<textarea value=\"lit\">{y()}</textarea>} />;",
        "const el = <div><span textContent={x()}>{y()}</span></div>;",
        "const el = <div><span textContent={x()}><div ref={r} onClick={h}>{y()}</div></span></div>;",
        "const el = <span textContent={x()}>{y()}</span>;",
        "const el = <div><noscript>{x()}</noscript></div>;",
        "const el = <div><noscript>{x()}</noscript><b>{z()}</b></div>;",
        "const el = <noscript>{x()}</noscript>;",
        "const el = <div><br>{x()}</br></div>;",
        "const el = <br>{x()}</br>;",
        // The `children`-attribute captures a slot writer discards.
        "const el = <div><span children={x()} textContent={t()} /></div>;",
        "const el = <div><textarea value=\"lit\" children={x()} /></div>;",
        "const el = <div><noscript children={x()} /></div>;",
        // …and the nested static-path residue, which is elided.
        "const el = <div><span children={x()} /></div>;",
    ] {
        let traced = compile(source, &with_map(true)).expect("compile with tracing");
        let plain = compile(source, &with_map(false)).expect("compile without tracing");
        assert_eq!(
            traced.code, plain.code,
            "{source}: tracing changed the emitted code"
        );
        assert_eq!(
            traced.source_map, plain.source_map,
            "{source}: tracing changed the source map"
        );
    }
}
