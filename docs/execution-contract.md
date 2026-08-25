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
fixture family and all 491 parity probes through this reconciliation.

### The transform baseline

The transform invariant is checked separately against the checked-in
`tests/transform-output-baseline.txt`, generated from the parent compiler
revision. It compares the exact `CompileOutput::code` bytes for every corpus
entry, including explicit parent rejections, and includes a one-byte canary
that the comparator must reject. A trace-on/trace-off comparison is only an
additive side-channel smoke test; it cannot prove base-vs-head identity when
both sides are produced by the same build.

This baseline covers DOM mode only — one of the ten compile modes in
`__tests__/parity/harness.js`'s `modes` table (`compile(&source, &options(false))`
is fixed to the DOM generator). The other nine (`dom-hydratable`,
`dom-hydratable-dev`, `dom-no-inline-styles`, `dom-wrapperless`, `ssr`,
`ssr-hydratable`, `universal`, `dynamic-universal`, `dynamic`) have no
byte-identity baseline of their own; they are pinned instead by their own jest
fixture snapshots (the per-mode `*-fixtures.test.js` files) and the
cross-mode/parity ratchets (`parity.test.js`, `cross-mode-parity.test.js`,
`parity-probes.test.js`), which this document's DOM-only baseline does not
substitute for.

A branch that changes `transform()` on purpose moves entries, so regenerating
the baseline is part of the change rather than a cleanup after it. The order is
fixed: run `transform_output_matches_parent_baseline` first and read the entries
it names, confirm every one is a shape the change predicts, then regenerate with
the `#[ignore]`d, environment-gated `regenerate_transform_output_baseline` and
review the diff line by line. An entry that moves for a reason the branch cannot
explain is a codegen regression, not a stale baseline. The baseline now records
the synchronized upstream `next` transform with semantic tracing disabled.
Trace work may add probes and therefore append entries, but it may not
deliberately move an existing entry. Compiler-behavior proposals belong on
separate topic branches and enter this branch only after upstream adopts them.

### The trace describes upstream `next`, not the parity target

This fork's production contract is upstream `next` plus an observational trace.
The trace is truthful about upstream's emissions, even where they diverge from
the parity-target Babel plugin. Three rules follow, and they are binding on both
producer and consumer:

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

Known divergences. Each is a `transform()` difference, not a trace defect, and
resolving one is a deliberate transform change with its own baseline
regeneration — see "The transform baseline" below:

1. **Nested void-element children.** `<div><br>{x()}</br></div>`: this fork's
   `lower_dynamic_native_child` walks into `lower_dom_children` unconditionally
   and emits `_$insert(_el$2, x)`; Babel discards the child list in every
   position and emits no insert. The census follows the emission, so the site
   is reported as `jsx-child`/`reactive-rerun`. A consumer must treat a
   `jsx-child` site inside a void native element as **uncertifiable**.
2. **Nested dynamic-`textContent` children.**
   `<div><span textContent={x()}>{y()}</span></div>`: Babel keeps the source
   child and emits `_$insert(_el$2, y)`. Upstream `next` takes its unconditional
   nested placeholder path and drops the source child. The trace retracts `y`
   because upstream emits nothing for it; a consumer targeting Babel must treat
   the shape as uncertifiable.
3. **Template-root `<noscript>` children.** `<noscript>{x()}</noscript>`: Babel
   drops `<noscript>` children in every position; this fork drops them only on
   the static-template fast path, and where the `<noscript>` is its own template
   root (a bare root, a fragment child, a component child, an attribute
   value) emits `_$insert(_el$, x)`. The census
   follows the emission, so the site is reported; a consumer must treat a
   `jsx-child` site inside a `<noscript>` as **uncertifiable**. (The same
   applies to a nested `<noscript>` whose attributes force it off the fast
   path.) The root-level `children`-attribute-promoted variant is the same
   divergence by another route: `<noscript children={c()}/>` promotes the
   attribute to a real child (divergence 4), and `lower_dom_element` then
   lowers it like any other template-root child, emitting
   `_$insert(_el$, c)`; Babel's `transformElement` never visits a
   `<noscript>`'s children at all — pushed-by-promotion or written
   directly — so it emits nothing. Still divergent.
4. **Nested `children` attribute promotion.**
   The upstream fix made native `children` child content everywhere and the
   fork's attribute planner now correctly skips it as a DOM property. However,
   the existing nested static-template fast path can consequently classify a
   nested element as having no dynamic work before
   `lower_dynamic_native_child` gets a chance to append the promoted value.
   For `<div><span children={x()}/></div>`, Babel emits
   `_$insert(_el$2, x)` while this fork emits only the `<span>` template. The
   same output residue covers the named nested promotion, duplicate, sibling,
   and component-child probes excluded in `parity-probes.test.js`. Those probes
   remain in the corpus as evidence: thirteen are excluded only in the six DOM
   modes where they differ, leaving their four matching SSR/universal modes
   asserted. The literal-duplicate-before-dynamic-`textContent` case is
   excluded only in `dom-wrapperless`, where it actually differs. The two
   non-literal dynamic `textContent` order probes match Babel in every mode and
   remain asserted.
   This branch does not add a nested workaround or alter upstream's `children`
   semantics. The semantic trace remains truthful about upstream's output: a
   skipped value is resolved as elided, and no synthetic child site is
   invented.

   The shapes that still agree remain asserted: source children shadow the
   attribute, void elements and spreads do not promote it, and the surviving
   source-order cases are covered separately. See "Discarded child lists" for
   the writers that can take Babel's single `children` slot away.

   Upstream's root capture also walks backward to the last *capturable*
   `children` value rather than selecting the last spelling before testing its
   value shape. The trace follows whichever value upstream actually lowers;
   it does not repair duplicate selection to match Babel.

Divergences found while investigating 4 above, all pre-existing:

5. **Template-root slot order.**
   `<span children={x()} textContent={t()}/>`: Babel's
   `transformAttributes` keeps one `children` slot, so the later dynamic
   `textContent` overwrites the captured attribute value with its synthesized
   text node and `x` is dropped. Upstream captures the child before its
   attribute loop and therefore still inserts `x`. The trace records that
   insert; a Babel-targeting consumer must treat this ordering as
   uncertifiable.
6. **JSX-valued holes.** `<span children={<b>{x()}</b>}/>` and the plain
   `<span>{<b>{x()}</b>}</span>` both emit Babel's `() => (() => {…})()` as
   `() => {…}` — the same expression, a different lowering shape. Unrelated to
   `children`; it is how this fork lowers a JSX element inside a hole.
7. **`undefined`/`null` `children` attribute.** `<span children={undefined}/>`
   (and `null`): Babel judges "literal" as "evaluates to a string or number",
   so it promotes and emits `_$insert(_el$, undefined)`; this fork's promotion
   filter asks whether the constant fold is confident at all, so it keeps the
   value as an attribute and emits nothing. Identical in both positions.
8. **Nested custom-element owner context.** With
   `contextToCustomElements`, upstream assigns `_$owner = _$getOwner()` at a
   template root but not for nested dashed custom elements, customized built-ins
   carrying `is=`, or `<slot>`. The trace must not invent the missing owner
   establishment; a Babel-targeting consumer must treat those nested contexts
   as uncertifiable.
9. **Textarea `value` fold on a non-literal-spelled but constant expression.**
   `<textarea value={"a" + "b"}/>`: Babel's fold judges "literal" by AST node
   type only (`StringLiteral`/`NumericLiteral`/`BooleanLiteral`/`NullLiteral`),
   before its own constant-fold pass ever runs on attribute values, so a
   `BinaryExpression` like `"a" + "b"` is not a literal there — Babel keeps
   `value` as an ordinary stateful DOM property and emits it as a plain
   assignment:
   ```js
   var _g2$ = _g1$();
   _g2$.value = "ab";
   ```
   This fork's attribute planner constant-folds every attribute expression
   before the textarea special-case check runs (`fold_confident`, called from
   `plan_attributes`), so `"a" + "b"` is already a `StringLiteral` node by the
   time `special_case_stateful_plans` asks whether `value` is literal — and it
   folds into the template text exactly as a real literal spelling would,
   discarding the assignment (and any real children) entirely:
   ```js
   var _g1$ = _$template__r_dom("<textarea>ab");
   const a = _g1$();
   ```
   Both forms render the same textarea value at first paint, but the emitted
   code differs. At a template root, a real `children` attribute alongside a
   non-literal-spelled constant `value` is promoted by Babel (the fold never
   claims the child slot there) while upstream's fold claims it and drops the
   promotion. The textarea fold itself is present in both positions because
   both paths share the same attribute planner; nested `children` is already
   omitted independently by divergence 4. The fold bullet under "Discarded
   child lists" is scoped to a genuine literal spelling for this reason — a
   constant-foldable non-literal expression is this divergence, not that
   bullet's parity-clean case.

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
  insert — the capture is gated on `!is_void_element` in both
  `lower_dom_element` and `lower_dynamic_native_child` — so it stays a
  `native-attribute` site resolved as `elided`.
- A nested native element's `children` **attribute** is not promoted by
  upstream's nested paths. Its censused `jsx-child` value is decided as
  `elided`, whether the nested element uses the static fast path or full
  attribute lowering. At a template root upstream does promote the value;
  dynamic `textContent` source order and duplicate selection can therefore
  produce the Babel divergences 5 and 4 above.
- A nested native element with dynamic `textContent` always receives
  upstream's synthesized placeholder. Any source child list is discarded and
  its sites are retracted. Template-root lowering retains its existing
  `!hasChildren` gate; the two positions intentionally describe different
  upstream paths here.
- The **textarea `value` fold, for a genuine literal spelling of `value`**
  (a string, numeric, or boolean literal, or no value at all — not merely a
  constant-foldable expression; see divergence 9), replaces the element's
  children with one child synthesized from the attribute (Babel's
  `path.node.children = [child]`), discarding the source list. All three paths
  that perform the fold retract the discarded sites: the nested native-child
  lowering, the template root (`lower_dom_element`, reached also from a
  fragment child, a component child and an attribute value), and the
  static-template fast path (`lower_static_native_template`), which the fold
  can make static *because* the dynamic source children are dropped. Babel
  discards the same lists — both compilers turn
  `<div><textarea value="lit">{y()}</textarea></div>` into a bare
  `_$template("<div><textarea>lit")` with no insert, and a `ref`/`on*` inside
  the discarded subtree goes with them — so these retractions are parity-clean
  for a literal spelling. A dynamic `textContent` alongside a literal `value`
  — `<textarea value="lit" textContent={t()}>` — keeps that folded child in
  both compilers; it is the initial text node the effect later overwrites.

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
