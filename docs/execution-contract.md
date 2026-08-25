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
fixture family and all 474 parity probes through this reconciliation.

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
explain is a codegen regression, not a stale baseline. Resolving divergence 4
moved no existing entry at all — no corpus entry had the shape — and added the
twenty `nested children attribute …` probes that could not be asserted before.
Resolving the literal-duplicate selection bug (see divergence 4's dedup note)
likewise moved nothing and added five more: four `nested children attribute
literal duplicate …` probes and the template-root `duplicate children
attributes literal last` probe.

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
   path.) The root-level `children`-attribute-promoted variant is the same
   divergence by another route: `<noscript children={c()}/>` promotes the
   attribute to a real child (divergence 4), and `lower_dom_element` then
   lowers it like any other template-root child, emitting
   `_$insert(_el$, c)`; Babel's `transformElement` never visits a
   `<noscript>`'s children at all — pushed-by-promotion or written
   directly — so it emits nothing. Still divergent.
4. **Nested `children` attribute promotion.** *Resolved.*
   `<div><span children={x()}/></div>`: Babel promotes the attribute to
   `_$insert(_el$2, x)`; this fork emitted nothing, because
   `lower_dynamic_native_child` never captured a `children` attribute the way
   `lower_dom_element` did. Until it was fixed the shape was left as a **hard
   reconciliation failure** — the census named a `jsx-child` site that lowering
   never resolved, and the file was rejected — because that failure was the
   divergence's only detection signal. `lower_dynamic_native_child` now
   performs the promotion, so the nested shape emits Babel's insert, the site
   resolves as `jsx-child`/`reactive-rerun`, and the file reconciles. The
   shapes that already agreed still do: with source children
   (`<div><span children={x()}>{y()}</span></div>`) both compilers insert only
   `y` and report the attribute as `native-attribute`/`elided`, a void
   element's attribute is never promoted, a spread keeps `children` in the
   merged props, and a value the constant fold resolves stays a `children`
   property write. See "Discarded child lists" for the three writers that can
   take the slot away from a `children` attribute.

   **Dedup note.** `children_attribute_container`'s first cut selected by
   walking attributes in reverse and skipping past any `children` whose value
   failed the literal/constant-fold filter — so a trailing literal duplicate
   (`<span children={x()} children={"s"}/>`) fell through to an *earlier*
   non-literal `children` and wrongly promoted it. Babel's own attribute
   dedup selects by name first (`babel-plugin-jsx/src/dom/element.ts:505-524`)
   and only then judges literal-ness on that single survivor, so a trailing
   literal duplicate blocks promotion outright — it does not resurrect an
   earlier attribute the dedup already discarded. The fix selects the last
   attribute named `children` by position alone (`rposition`, the same
   name-only selection `children_attribute_outranks_text_content` already
   used), then applies the literal filter to that one attribute and bails on
   failure. This was a latent bug in the template-root path too, not only the
   nested one added here — both call the same function.

Divergences found while resolving 4 above, all pre-existing, none of them
nesting-specific, and all still open:

5. **Template-root slot order.** `<span children={x()} textContent={t()}/>`:
   Babel's `transformAttributes` keeps one `children` slot, so the later
   `textContent` overwrites the captured attribute value with its synthesized
   text node and `x` is dropped; `lower_dom_element` captures the attribute
   without regard to attribute order and inserts `x`. Nested lowering follows
   Babel's order (both writers are compared there); the template root does not.
6. **JSX-valued holes.** `<span children={<b>{x()}</b>}/>` and the plain
   `<span>{<b>{x()}</b>}</span>` both emit Babel's `() => (() => {…})()` as
   `() => {…}` — the same expression, a different lowering shape. Unrelated to
   `children`; it is how this fork lowers a JSX element inside a hole.
7. **`undefined`/`null` `children` attribute.** `<span children={undefined}/>`
   (and `null`): Babel judges "literal" as "evaluates to a string or number",
   so it promotes and emits `_$insert(_el$, undefined)`; this fork's promotion
   filter asks whether the constant fold is confident at all, so it keeps the
   value as an attribute and emits nothing. Identical in both positions.
8. **Nested custom-element owner context.** `<div><my-widget id={i()}/></div>`
   with `contextToCustomElements`: `lower_dom_element` emits the
   `_$owner = _$getOwner()` assignment for a template-root custom element,
   `lower_dynamic_native_child` emits nothing for a nested one. Independent of
   `children` — a nested custom element with any dynamic content shows it.
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
   code differs, and — critically — a real `children` attribute alongside a
   non-literal-spelled constant `value` is promoted by Babel (the fold never
   claims the child slot there) while this fork's fold still claims it and
   drops the promotion. Pre-existing, not introduced by resolving 4 above, and
   present in both the template-root and nested position since both paths
   share the same attribute planner. The fold bullet under "Discarded child
   lists" is scoped to a genuine literal spelling for this reason — a
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
- A `children` **attribute another writer of Babel's `children` slot takes
  away**. `transformAttributes` fills one slot per element, so the value can be
  captured and then discarded unlowered. This is a discarded *value*, not a
  discarded list: nothing is emitted for it, so the census's `jsx-child` site is
  decided as `elided` rather than retracted, and Babel emits nothing for it
  either, so the decision is parity-clean. Three writers take the slot in
  nested native-child position: a **dynamic `textContent` later in the
  attribute list** (`<div><span children={x()} textContent={t()}/></div>` —
  Babel's `children = t.jsxText(" ")` overwrites the capture; a `textContent`
  *before* the attribute loses, and then both the effect and the insert are
  emitted), the **textarea `value` fold on a literal spelling**, which fills
  the child list in preprocessing so `!hasChildren` blocks the push
  (`<div><textarea value="lit" children={x()}/></div>` — a constant-foldable
  but non-literal-spelled `value` does not fill the slot in Babel and is
  divergence 9, not this bullet), and **`<noscript>`**,
  whose pushed child list Babel never visits at all
  (`if (tagName !== "noscript") transformChildren(…)`), so the capture is
  discarded rather than promoted into an insert Babel does not emit. At the
  template root the same shapes are reached differently: the fold retracts the
  already-promoted child instead of eliding it, `<noscript>` is divergence 3
  above, and the attribute-order contest is divergence 5.
- A **nested** native element with a dynamic `textContent` replaces its content
  with a text placeholder and discards its source children; the recorder
  retracts their censused sites (divergence 2 above). The **template-root**
  path is different in two ways: it reaches its placeholder branch only when
  the element has no children of its own (Babel's `!hasChildren` gate), so that
  branch discards nothing — but its `value` fold, below, discards on the root
  path exactly as the nested path does.
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
  for a literal spelling. (A dynamic `textContent` alongside a literal `value`
  — `<textarea value="lit" textContent={t()}>` — instead hits divergence 2:
  the placeholder branch discards the folded child same as any other, but
  this fork's placeholder emits a blank space where Babel's still carries the
  literal text into the template ahead of the effect's overwrite.)

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
