# Semantic execution contract

`CompileOptions::semantic_trace` adds a DOM-only sidecar to `compile`. The
sidecar is produced by the same lowering pass as `CompileOutput::code`; it
does not alter generated code. The producer is intentionally conservative:
facts are source spans and lowering observations, not claims about runtime
ownership, ancestry, timing, or whether a render eventually occurs.
The serialized sidecar carries `version: 2` (`SEMANTIC_TRACE_VERSION`) and
rejects unknown fields.

## Totality and reconciliation

Before lowering, `ExecutionCensus` enumerates every supported JSX execution
site. During lowering, `TraceRecorder` records the decision at the emission
site. `finish()` rejects an unresolved censused site, a conflicting decision,
or a decision for a site absent from the census. The corpus test runs every
fixture family and all 449 parity probes through this reconciliation.

The transform invariant is checked separately against the checked-in
`tests/transform-output-baseline.txt`, generated from the parent compiler
revision. It compares the exact `CompileOutput::code` bytes for every corpus
entry, including explicit parent rejections, and includes a one-byte canary
that the comparator must reject. A trace-on/trace-off comparison is only an
additive side-channel smoke test; it cannot prove base-vs-head identity when
both sides are produced by the same build.

## Execution sites

`ExecutionSite` contains a byte span, a closed `ExecutionSiteKind`, and one
terminal decision. The kind and decision describe the lowering branch:

- value sites use `eager-once`, `reactive-rerun`, `caller-context`, or
  `elided`;
- callback sites use `later-event`, `later-render`, or `ref-apply`;
- `control-flow-render` is emitted authoritatively for a function child of a
  configured, unshadowed built-in. Consumers must consume that fact rather
  than re-deriving built-in identity from their own JSX walk.

Unconfigured or shadowed built-ins remain ordinary `component-child` sites.
Literal-only expressions are not sites. When a lowering path discards a
censused value, the value itself may be recorded as `elided`; nested source
that never reaches a 2.0 lowering path is not invented as a separate site.

## Additive wrapper facts

`owner_establishments` contains `{ span, wrapper, group_id? }`. It records
where a wrapper was emitted and preserves the wrapper identity as a string,
one fact per wrapper call the lowering emits.
`span` is the exact original source span of the expression or JSX node whose
lowering is wrapped — never the JSX expression container including braces, the
whole attribute, or a generated-AST span. For a wrapper around an execution
site the spans are equality-joinable, and the legacy and successor facts use
that same site-span rule.
Where the construct is a JSX node rather than an expression, the fact joins a
`ComponentRenderSite` or `DeferredCallbackSite` span instead: `createComponent`
and a component child's `insert` are spanned at the JSX element, which is a
component render site and not an execution site.

A conditional's memo is the one case where the wrapped expression is smaller
than the site: `{cond() ? left() : right()}` lowers to `memo(() => !!cond())`,
with the branches evaluated in the insert's or getter's scope, so the memo fact
is spanned at `cond()` — the test it actually memoizes — and is *contained by*
the enclosing site's span rather than equal to it. Each memo the lowering emits
gets its own fact, so a nested conditional reports one fact per memoized test,
and a fragment or component child whose thunk is also memo-wrapped reports that
memo separately at the child expression's span. A consumer joining owner facts
to sites must therefore join by containment, not by equality alone.
A span is also not a unique key: a `createComponent` and its child's
`insert` can share one span, so consumers key on `(span, identity)`.

And a fact need not join anything at all: a literal-only hole such as
`<div>{true}{undefined}{null}</div>` really does emit an `insert` per hole, and
those inserts are reported, but literal-only leaves are deliberately not
`ExecutionSite`s, so those facts join to nothing.

The consumer maps audited identities through its dialect and maps an unknown
or unaudited identity to `Unknown`; it must not infer runtime meaning from the
string. Current producer identities include:

- `effect` (or the configured effect wrapper), with one shared `group_id` for
  the entries emitted by one multi-dynamic effect;
- `memo` (or the configured memo wrapper);
- `createComponent`, `insert`, `direct`, `delegated`, and `ref-apply`;
- `scope`, the 2.0-only hydration-scope emission site.

`group_id` links spans sharing one wrapper invocation. It is not a runtime
owner id and says nothing about flush order or post-flush timing.

## Component and deferred callback facts

`component_render_sites` contains `{ span }` at each `createComponent`
lowering site. It records where the render operation is emitted and does not
claim that the component will render at runtime.

`deferred_callback_sites` contains `{ span, receiver_span }`. It links a
deferred component prop, spread, or ref value to the enclosing JSX component
span. It is a source relationship only; the consumer may attach the callback
to the receiver span but must not infer callback timing or receiver behavior.

`owner_establishments` is the additive successor vocabulary. The legacy
`ownership_sites` field and `OwnershipDecision::{Owned, Unowned, Leaf}` remain
emitted for the currently pinned consumer and will be removed only after that
consumer migrates. Unknown wrapper identities remain representable so the
consumer can fail closed to `Unknown` without losing the source location.

## Scope

Spans are byte offsets into the exact source and options used for compilation.
Only DOM generation currently produces a trace; unsupported output modes and
files skipped by `requireImportSource` return a configuration error instead of
an incomplete trace.
