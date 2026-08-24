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

### The trace describes this compiler, not the parity target

The trace is truthful about *this compiler's* emissions, even where they
diverge from the parity-target Babel plugin. Three rules follow, and they are
binding on both producer and consumer:

- A site is retracted only where a child list is genuinely discarded by *this*
  compiler. Retracting to match the parity target — or inventing a site because
  Babel emits one — would make the trace a description of a compiler that is
  not the one that produced the code.
- Every known divergence is named below, with the emitted code of both
  compilers as its evidence. A consumer must not certify from facts an
  affected divergence touches; there the trace is accurate about this
  compiler's output and inaccurate about the parity target, and only the
  consumer knows which it is reasoning about.
- Absence of a fact is never evidence of no execution. A retracted site says
  *this* compiler emitted nothing there; it does not say the expression is
  dead.

Known divergences, all pre-existing and out of scope while `transform()`
output is frozen:

1. **Nested void-element children.** `<div><br>{x()}</br></div>`: this fork's
   `lower_dynamic_native_child` walks into `lower_dom_children` unconditionally
   and emits `_$insert(_el$2, x)`; Babel discards the child list in every
   position and emits no insert. The census follows the emission, so the site
   is reported as `jsx-child`/`reactive-rerun`. A consumer must treat a
   `jsx-child` site inside a void native element as **uncertifiable**.
2. **Nested dynamic-`textContent` children.**
   `<div><span textContent={x()}>{y()}</span></div>`: Babel emits no
   placeholder there — template `` `<div><span>` ``, `_$insert(_el$2, y)`, and
   an effect writing `_el$3.data` where `_el$3 = _el$2.firstChild` is whatever
   the insert produced; its text placeholder appears only in the no-children
   shape (`<div><span textContent={x()}/>`). This fork takes the placeholder
   branch even with children — it is missing Babel's `!hasChildren` gate,
   which its own template-root path does have — and drops the insert. The
   discarded children's sites are retracted, so a consumer must read that
   absence as **uncertifiable**, not as no-execution.
3. **Template-root `<noscript>` children.** `<noscript>{x()}</noscript>`: Babel
   drops `<noscript>` children in every position; this fork drops them only on
   the static-template fast path, and where the `<noscript>` is its own template
   root (a bare root, a fragment child, a component child, an attribute
   value) emits `_$insert(_el$, x)`. The census
   follows the emission, so the site is reported; a consumer must treat a
   `jsx-child` site inside a `<noscript>` as **uncertifiable**. (The same
   applies to a nested `<noscript>` whose attributes force it off the fast
   path.)
4. **Nested `children` attribute promotion.** `<div><span children={x()}/></div>`:
   Babel promotes the attribute to `_$insert(_el$2, x)`; this fork emits
   nothing, because `lower_dynamic_native_child` never captures a `children`
   attribute the way `lower_dom_element` does. This one deliberately **remains
   a hard reconciliation failure** — the census names a `jsx-child` site that
   lowering never resolves, and the file is rejected. That failure is the
   divergence's only detection signal, so it is kept rather than papered over
   with a retraction. It fails only when the element has **no source
   children**: with them (`<div><span children={x()}>{y()}</span></div>`) both
   compilers insert only `y` and ignore the attribute, which this fork reports
   as `native-attribute`/`elided`, and the file reconciles. The same shape at
   template root (`<span children={x()}/>`) agrees with Babel and reconciles.

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

### Discarded child lists

A child list a lowering path drops without visiting produces no sites at all —
not even `elided` ones, because no value is written. Where the census, which
walks source only, cannot see the drop, the recorder retracts the affected
sites during lowering. This is the complete enumeration of the DOM paths that
discard a child list:

- A **void native element** keeps its children only in nested native-child
  position, where `lower_dynamic_native_child` walks into `lower_dom_children`
  unconditionally: `<div><br>{x()}</br></div>` emits a real reactive `insert`
  into the `<br>`, and the child is a `jsx-child` site like any other
  (divergence 1 above). In every other position the void element is its own
  template root and `lower_dom_element` gates child lowering on
  `!is_void_element`, so a bare JSX root, a fragment child, a component child
  and an attribute value all discard the list unlowered and claim nothing
  inside it.
- A `children` **attribute** on a void element is never promoted to a child
  insert — the capture in `lower_dom_element` is gated on `!is_void_element` —
  so it stays a `native-attribute` site resolved as `elided`.
- A **nested** native element with a dynamic `textContent` replaces its content
  with a text placeholder and discards its source children; the recorder
  retracts their censused sites (divergence 2 above). The **template-root**
  path is different in two ways: it reaches its placeholder branch only when
  the element has no children of its own (Babel's `!hasChildren` gate), so that
  branch discards nothing — but its `value` fold, below, discards on the root
  path exactly as the nested path does.
- The **textarea `value` fold** replaces the element's children with one child
  synthesized from the attribute (Babel's `path.node.children = [child]`),
  discarding the source list. All three paths that perform the fold retract the
  discarded sites: the nested native-child lowering, the template root
  (`lower_dom_element`, reached also from a fragment child, a component child
  and an attribute value), and the static-template fast path
  (`lower_static_native_template`), which the fold can make static *because*
  the dynamic source children are dropped. Babel discards the same lists — both
  compilers turn `<div><textarea value="lit">{y()}</textarea></div>` into a bare
  `_$template("<div><textarea>lit")` with no insert, and a `ref`/`on*` inside
  the discarded subtree goes with them — so these retractions are parity-clean.

  The fold's replacement child is spanned at the *attribute*, and it is not a
  source expression: nothing the author wrote executes there, so it is not a
  site. A valueless `value` folds to a synthesized `{true}` that really is
  inserted (both compilers emit `_$insert(_el$2, true)`); the emitted `insert`
  is still reported as an `owner_establishment` at the attribute's span, and
  like a literal-only source hole's `insert` it joins to no site.
- **`<noscript>` on the static-template fast path.** Its markup is inert, so
  `lower_static_native_template` emits the tag and returns without visiting the
  children at all — the fold's replacement included. The retraction prunes
  every site in the unvisited subtree, attribute, `ref` and handler sites
  included, not only `jsx-child` ones. Babel drops the same subtree, so
  the retraction is parity-clean. A `<noscript>` whose attributes force it off
  the fast path, and one that is its own template root, do lower their children
  and keep their sites (divergence 3 above).

Attributes are not children: a void element's attributes, events and refs lower
in both positions and keep their sites, and the fold likewise leaves the
element's other attributes and its siblings' sites untouched.

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
