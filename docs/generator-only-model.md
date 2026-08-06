# The generator-only model — an evaluation

Status: deliberation document. Nothing here is decided. This evaluates the
proposal (Dev's) to make async generators the *only* server component model:
no `<Loading>` in server markup, no reactivity on the server, no reactive
passthrough at the slot border. It is written against the axioms in
`server-components-principles.md` and assumes familiarity with
`progressive-frame-emission-proposal.md`, whose mechanism it would promote
from "a new component kind" to "the model."

The gating question, per review: **client slots whose fills are async at the
top level**. Section 4 is the proposed solve. If that section doesn't hold,
the model doesn't.

Section 7 records the subsequent step-back: generator-only is one of *two*
self-consistent poles, and the full-reactivity pole — the ledger generalized
to markup holes — deserves equal standing in the decision. The document is
therefore an evaluation of a triangle (hybrid, generator-only, fully
reactive), not a verdict on one corner.

---

## 1. The proposition, stated precisely

Every server component is (or normalizes to) an async generator over
renderable snapshots:

```tsx
"use server";
export async function report(id: string) {
  return async function* (props: { chart: Slot<{ points: number[] }> }) {
    yield <Skeleton />;                       // paint now
    const head = await fetchHead(id);
    yield <Head data={head} />;               // partial
    const rows = await fetchRows(id);
    yield (
      <article>
        <Head data={head} />
        <Rows rows={rows} />
        {props.chart({ points: summarize(rows) })}
      </article>
    );                                        // settled
  };
}
```

- A plain `async` component is the single-yield special case. There is no
  mode switch because there is only one mode — this dissolves the
  liveness-consistency objection to the hybrid design.
- **No server `<Loading>`**: partial readiness is expressed by yielding
  partial markup. The fragment/deferred-segment machinery has no author-
  facing surface.
- **No server reactivity**: no memos, projections, or stores participate in
  rendering. You `await` data and render values. Nothing reactive exists to
  cross a border.
- **No reactive passthrough**: slot args are settled values at each yield.
  A "live" arg is a sequence of yields, not a data-channel subscription.
- Each yield renders, emits as a root HTML chunk plus that yield's slot
  records, and the client morphs (DR-5) with occurrence identity preserving
  fill state. Exactly the progressive-emission mechanism — applied
  universally.

## 2. What it deletes, what it keeps

The current design runs three within-response liveness machineries:

| Machinery | Job | Under generator-only |
|---|---|---|
| `<Loading>` / fragments / deferred segments | markup that settles out of order | **deleted** — yields express partial readiness; ordering is the generator's |
| Value tier (DR-2 case 2) | promises/iterables crossing whole, client read suspends/updates | **deleted** — args are settled values per yield |
| Binding ledger (DR-2 case 1) | watched expressions re-emitting on commits | **deleted as an engine** — but see below: its record substrate survives |

What survives untouched, and is load-bearing in both worlds:

- **Frames, the store, versioning** — transport is unchanged.
- **Slot records + supersession** — the ledger work's hardening (bindings
  keyed by `(occurrence, arg)`, replace-on-reopen, monotonic versioned refs)
  is *precisely* what per-yield record re-emission requires. Holding DR-2
  does not strand this; the generator model is its second consumer.
- **Live props** — the client applies a later yield's record to a mounted
  occurrence in place; fill state survives. Already shipped.
- **DR-5 identity-first morph** — promoted from "reconciliation strategy" to
  the model's *only* update primitive. It must be excellent.
- **DR-1 identity split, single-flight, host retention, re-invocation** —
  the cross-request story is identical in both models.

The largest deletion is invisible in the table: **the server reactive graph
itself**. With it go the problems we had *designed but not built*:

- Case 3 (containers crossing as snapshot + patch trace) — evaporates.
  Nothing reactive exists to trace. solidjs/solid#2966's entire class is
  unconstructible rather than solved.
- Case 4 (async at container paths) — evaporates with it.
- The first-value lock, epoch caching, commit funnels, tapped-vs-pumped
  iterator paths — all machinery whose subtlety this document's siblings
  spent pages justifying — gone.

That is the honest weight on the "for" side: the model doesn't just simplify
the implementation, it deletes the two hardest unimplemented specs and the
subtlest implemented one.

## 3. The duality finding

If yields exist, DR-2's engines stop being *capabilities* and become
*optimizations*. The ledger pushes new data into old markup; a yield pushes
new markup around old fills. Both deliver "the value changed" to the client;
they differ in wire shape and work location:

- **Ledger/value tier:** one data chunk per change; client applies to a
  signal; no DOM diff. Cheap per tick. Requires the server reactive graph,
  the commit funnel, and two liveness semantics for authors to learn.
- **Yield:** one HTML snapshot per change; client morphs; fills keep state
  via records. Costlier per tick (render + wire + diff — streaming
  compression softens the wire; morph cost scales with component size, not
  change size). Requires one semantics: *yield when you have something new
  to say.*

Neither can express something the other cannot. The decision is therefore
about efficiency envelopes and authoring surface, not expressive power —
which is exactly why it's a legitimate reason to hold the DR-2 merge: if
generator-only wins, the value tier and the ledger engine are dead weight on
the public surface.

### 3.1 The server-diff assumption

The model's attractiveness changes materially if you assume **server-side
diffing** as the eventual transport: the server retains the previous yield's
render tree for the life of the response (request-scoped memory — the
response window is the retention window, same lifetime discipline as
everything else here), diffs each yield against it, and emits patch
operations instead of full HTML. First yield is always the full snapshot;
later yields are ops; the client applies ops to real DOM directly.

- **It closes the duality gap.** The ticker tick that was "whole-snapshot
  render + wire + client morph" diffs to one set-text op — the same weight
  class as the ledger's data chunk. Wire cost becomes proportional to
  change size, client work becomes application rather than diffing, and the
  efficiency argument for keeping two liveness engines effectively
  disappears. What remains is the server rendering the whole component per
  yield, which is the cheap leg of the trip.
- **It composes because yields are pure.** Diffing needs no reactivity and
  no dependency tracking — it's structural comparison of two snapshots from
  a request-scoped render. This is why it's a transport optimization under
  the same authoring contract, not a competing architecture (the framing
  `progressive-frame-emission-proposal.md` already records).
- **Slot ranges are the natural diff fence.** Fill-owned ranges are opaque
  to the differ — patches never descend into them; arg changes ride the
  existing record channel with supersession. Occurrence identity is
  preserved by construction rather than by morph-time matching. Keyed
  elements inside server markup give the differ its reorder identity, same
  as DR-5 uses today.
- **Resync is already designed.** The store's version discipline covers the
  gap cases: a client that can't apply a patch sequence (missed version)
  falls back to requesting/receiving a full snapshot. Cross-*response*
  updates (refetch, re-invocation) keep full-snapshot + DR-5 morph — the
  server retains nothing across responses, so the differ never pretends to
  a memory it doesn't have. DR-5 stays load-bearing as the cross-response
  and fallback mechanism; within-response becomes op application.
- **The one constraint to bake in now:** the frame sink flattens renders to
  HTML strings at emission today. A future differ needs the yield's
  *structured* form (the pre-flattened tree, or at minimum a stable
  block-segmented form) available at the sink boundary. If we adopt
  generator-only with diffs as the assumed endgame, the sink's emission
  contract should preserve structure from day one — retrofitting structure
  onto a string pipeline later is the expensive path. This is the only
  place the assumption reaches back into near-term design.

Sequencing stays two-step: ship snapshot yields first (DR-5 morph already
exists and is the permanent fallback path), add the differ as a pure
transport upgrade. The model choice can be made before the differ is built —
but only if the sink constraint above is respected from the start.

## 4. The gating case: top-level async client fills

### 4.1 The problem

A client fill can be async at its own top level, independent of any server
async: a `lazy()` fill whose chunk hasn't loaded, a fill that reads client
data (`createAsync`) before returning JSX. Today those sink into a covering
boundary that *server markup created*: an unboundaried async fill inside a
deferred segment suspends into the segment's reconstructed `<Loading>` (the
reveal seam), and the shell-gate mount covers t=0 fills. The current test
"covers an unboundaried async client fill revealed in a deferred segment (no
orphan)" pins exactly this.

Delete server `<Loading>` and the segment seams go with it. An async fill's
suspension then escapes to the nearest client boundary — the mount's
covering `<Loading>` *outside the frame*. Consequences, in increasing order
of badness:

1. First yield with a pending fill: the whole frame holds behind the mount
   gate even though the server said "paint this now" — a yield is not a
   paint. The model's core promise breaks on its first contact with a lazy
   chunk.
2. Later yield introduces an occurrence whose fill is async: the mount gate
   has long released; the suspension has *no* boundary. The orphan case.
3. Discipline ("fills must wrap their own async in `<Loading>`") fails on
   the most common case: `lazy()` fills suspend during *invocation*, before
   any author-written JSX can wrap them. Code-splitting is not an edge case.

### 4.2 The solve: occurrence-level seams, "hold what's there"

Generalize the reveal seam from segments to **every slot occurrence**. The
machinery exists and is shipped (`revealSeam` in solid-web's frames client:
`insert(createLoadingBoundary(content, fallback))` at a seam position); what
changes is where it applies and what the fallback is.

**Every slot invocation runs under a frame-owned boundary whose fallback is
the range's current interior.** "Current interior" resolves per situation:

- **Fresh occurrence, empty hole** (today's invariant — server renders
  `<!--slot:k:start--><!--slot:k:end-->`): fallback is empty. The
  surrounding yield paints; the fill's spot is blank until it settles. Not a
  regression — strictly better than holding the whole frame.
- **Fresh occurrence, seeded hole:** relax the empty-range invariant to
  *"the server may render placeholder content inside a slot range; the fill
  replaces it on settle."* The claim/adoption path already treats a range's
  existing nodes as the seed (`existing` seeds `insert`'s tracked array; the
  document-adoption sync claims in place), so a seeded hole is the same
  shape, deliberately authored:

  ```tsx
  <props.chart points={pts}>
    <svg class="chart-skeleton" />   {/* server-owned fallback, in the hole */}
  </props.chart>
  ```

  This is the model's aesthetic answer, not just a mechanism: **the fallback
  is server markup** — HTML as the data, again. The author writes fallbacks
  where the wait actually is, in the language they're already writing.
- **Existing occurrence across a yield morph:** the previous fill content
  *is* the interior, and DR-5 already preserves it under occurrence
  identity. A re-invoked fill that suspends holds its predecessor on screen
  — "hold what's there" is the natural morphing-system fallback (never
  regress content you have).

Composition with the mount gate stays coherent: the first yield's apply
releases the shell gate (that machinery survives — it gates on *frame*
content, not fill settlement), and each pending fill holds only its own
occurrence's seam. A lazy chunk in the corner of a dashboard no longer
decides when the dashboard paints.

Cost note: this adds one boundary per *invoked* occurrence (direct-insert
`{props.children}` positions need none — nothing runs). Boundaries are
cheap, and the seam is created lazily at invocation, mirroring how segment
seams are only reconstructed when a segment defers.

### 4.3 What this does NOT cover, on purpose

The DR-2 value tier's *within-response* data pushes — the progress ticker as
one data chunk per token batch — have no equivalent here. Under
generator-only that traffic is yields (whole-snapshot morphs) or it is
nothing. This is the honest residue of the gating case: the *suspension*
story fully solves; the *granular update* story is consciously surrendered
to the yield's granularity. Whether that trade is acceptable is section 6's
first question.

## 5. Worked examples

**Chat (the DR-2 showcase, inverted).** Today: markdown parts stream as
fragments, `progress` crosses as an async iterable (one data chunk per
batch), `stats` as a promise. Generator-only: the reply component yields a
new snapshot per batch — which is *already exactly what the progressive
proposal specified for the markdown*, because broken-markdown states demand
retroactive edits that only snapshot-morphing handles. The ticker rides the
same yields as arg updates in each snapshot's records (supersession applies
them; the fill keeps state). One mechanism where DR-2 needed three. The
price: at 220ms/batch, each tick renders and morphs the whole reply instead
of patching one signal — fine at chat scale, and the pathological version
(a 60Hz ticker under a 10,000-row table) is mispatterned in *both* models
(DR-2 just fails softer, patching data it can't render fast enough).

**Multi-region dashboard (concurrency).** Today: one render, three
`<Loading>` regions, fragments settle in completion order — concurrency is
free and intra-component. Generator-only: a single generator is one total
order; three independent sources must be hand-merged into combined snapshots
(`combineLatest` by hand) — real authoring pain — OR each region is its own
server component with its own stream, and concurrency returns at component
granularity with skeleton-first yields. The model thus *forces* the
component boundary to be the concurrency boundary. Defensible (it's RSC's
position too, and it matches the frame transport's unit), but it's the
model's biggest authoring opinion, and a `mergeYields()` helper is probably
a v1 necessity rather than a nicety.

**Notes app (navigation, single-flight, retention).** Unchanged. Yields are
a within-response phenomenon; addresses, host retention, morph-on-refetch,
and single-flight mutations neither know nor care. The matrix suite's
lifecycle cells are model-agnostic for the same reason.

## 6. What the decision turns on

1. **Is yield-granularity acceptable as the only within-response update?**
   The duality finding says this is an efficiency question, not an
   expressiveness one — and under the server-diff assumption (§3.1) it
   mostly dissolves: a data-shaped change diffs to a data-shaped patch. The
   question then reduces to whether we commit to diffs as the endgame and
   accept snapshot-morph costs in the interim. If yes → the value tier and
   ledger engine come off the public surface (their record substrate
   stays). If no → the hybrid stands and generator components remain one
   kind among several, with two liveness semantics to document forever.
2. **Is component-boundary concurrency enough?** Deleting server
   `<Loading>` makes splitting components the only way to parallelize
   waits. If most real pages shatter into per-region server components
   purely for pacing, we've re-invented fragments with worse ergonomics.
3. **Does "hold what's there" + seeded holes survive contact?** Section 4
   is designed against shipped machinery, but seeded holes relax a current
   invariant (empty slot ranges) and touch DR-3's border rule (the seed is
   server markup *inside* a client position — legal because it's a
   fallback the fill replaces, never content the fill receives). Needs the
   same adversarial pass DR-2 got.
4. **Migration honesty.** Deleting server reactivity is a *semantic*
   deletion: `createStore`/projections in server components stop meaning
   anything, and case 3's "someday" becomes "never." With no production SC
   usage today this costs nothing now — the point is only that the door
   closes by design, not by omission.

## 7. Stepping back: two consistent poles, and the reactive endgame

Deliberation after the sections above (the model's author's step-back): the
*hybrid* is the only position with two liveness semantics. Both extremes are
self-consistent, and they differ on one axis — what "update" means on the
server within a response.

**Generators are a rerender model, even when the wire is diffs.** Update =
run again, produce a snapshot, transport the difference. Granularity comes
from nesting rerender scopes — generator components in the tree, marked like
loading boundaries, so a yield diffs only its own subtree. But nesting
rerender scopes re-introduces the RSC waterfall *structurally*: a child
generator does not exist until its parent yields it, so its work starts at
yield time. Diffs fix the wire; they cannot fix when work starts. Skeleton-
first discipline and manual fetch hoisting mitigate; reactivity makes the
mitigation unnecessary by construction.

**Reactivity is a render-once model.** The tree is declared once; every
async branch starts concurrently where it's declared; `Loading` streams
settlement in completion order. No rerender, no diff computation — updates
originate at the change site, so the wire carries exactly what changed
because the graph *knows* what changed. This is the more efficient model on
both axes (server compute and work-start time). Its historical gap is the
one this document's subject was invented to fill: no clear way to mutate
already-streamed markup.

**The gap-filler is the ledger, generalized from records to holes.** DR-2
case 1's engine — watch an expression, equality-gate, re-emit on commit,
supersede on re-render — currently feeds slot records. Pointed at markup:
every dynamic insertion position gets a marker, a commit re-evaluates the
hole's expression, a changed hole re-renders that expression subtree to
HTML and re-emits over the fragment channel, and the client applies it with
DR-5 morph *scoped to the hole* — fill state and occurrence identity
survive because ranges fence the morph. Render-once, live holes, no
snapshots, no differ.

Notably, **no compiler change is required for insert positions**: the SSR
compile already emits dynamic holes as re-runnable thunks (`ssr()`'s
function holes and `_$ssrGroup` groups exist so async escalation can re-run
them), and the server runtime already mints per-hole markers when a hole
escalates (`<!--rh{id}-->` splice points, `<!--!${id}-->…<!--!$/{id}-->`
placeholder pairs). A live-hole mode marks watched holes the way escalated
holes are already marked and opens ledger bindings — all runtime.

**Attribute holes** (`class={sig()}`) can't use range markers — no legal
comment position inside a tag — and need element addressing instead. The
governing constraint: **the SSR compile is one artifact shared with
document SSR**, so liveness must not change document-SSR bytes or fork
compile modes. The path that satisfies it: attribute-position bytes are
already runtime-controlled (`ssrAttribute` / `escape(v, true)` emit inside
the tag at render time), and `ssrHydrationKey` is the shipped precedent
for runtime-gated address injection (` _hk=…` only in hydration contexts,
empty string otherwise). A live frame render's attribute hole appends its
own element address the same way; every other context emits nothing —
document SSR stays byte-identical, one compile mode. The remaining item is
a *verification*, not a design: that attribute holes compile as
re-runnable thunks (async escalation likely already forces this); if some
shape is eagerly evaluated, the fix is thunk-wrapping — a compiled-JS
change, never an emitted-HTML change. v1 can still sequence insert
positions first and attributes as fast-follow.

**Post-flush application is a composition of shipped pieces.** A hole
update after its HTML has flushed is: a fragment record for an
already-revealed key at a newer version (wire — the fragment channel and
its version fencing exist), located by the hole's range markers
(addressing — minted at render), applied by DR-5 morph scoped to the range
(application — the same walk frame-version morphs run, narrower root),
with client fills untouched because fill ranges are already
morph-protected fences (state — by construction, not by care). The one new
client behavior: a fragment key currently reveals once; a re-emission for
a revealed key must morph the range instead of being ignored — a bounded
change in the frame client's apply path. Nested holes supersede on outer
re-render (the ledger's replace-on-reopen, same as re-rendered
occurrences); t=0 document SSR keeps holes settle-once (the first-value
lock's hydration-consistency rationale is untouched — within-response
liveness stays the frame render's story). On the motivating demos: the
LLM/markdown reply becomes a hole over an iterator memo — per-batch morph,
retroactive markdown fixes, selection/focus survival, no new authoring
surface at all; pagination remains per-cursor server components in every
pole (client-paced accumulation was never a response-window liveness
problem).

Consequences worth stating plainly:

- **It subsumes the generator's showcase.** The LLM reply becomes
  `<div>{md()}</div>` over an iterator memo: one hole re-evaluating per
  batch, morph-applied within the hole — retroactive markdown edits handled
  exactly as yields handled them, without the component re-running.
  Imperative streams enter as async iterables feeding holes, not as a
  second component kind.
- **It flips a ratification, honestly.** "Markup holes settle once" was
  ratified during DR-2 on the premise that the liveness engine served only
  slot args. At the model level, full reactivity makes holes and args
  uniformly live for the response window — consistency achieved in the
  opposite direction from generator-only. Both poles dissolve the liveness
  cliff; only the hybrid keeps it.
- **The build-cost comparison inverts.** Generator-only still needs its
  diff engine and a structured sink contract (§3.1) — the differ is the
  large new artifact. Full reactivity needs hole markers (runtime-minted,
  same as escalated holes today), the ledger extended from records to holes
  (engine shipped; hole re-render rides the fragment path), and scoped
  morph (shipped) — attribute liveness rides the `ssrHydrationKey` pattern
  (runtime-gated address injection; no document-SSR byte change, no compile
  fork). From where the branches actually stand, the reactive pole is
  plausibly the *smaller* build: DR-2's engine work was this concept's
  core, built before the concept had its name.
- **Retention symmetry.** Both poles hold response-scoped server state: the
  differ retains the previous tree; the reactive graph retains itself. The
  memory argument distinguishes neither.

What remains genuinely on the generator side: no server reactive semantics
to learn (plain JS + yield), and the imperative shape matches how the
streaming era thinks. What remains on the reactive side: efficiency by
construction, no waterfalls by construction, and strategic differentiation —
generator+diff is RSC-with-morphing, a position others can and will build;
fine-grained reactivity over the wire at compile granularity is a position
only this architecture can occupy.

## 8. Where this leaves DR-2

Hold the merge (per current plan: freeze → matrix → then this decision).
The branches lose nothing by waiting: the supersession/record hardening is
generator-prerequisite work either way, the signals fix and `dynamic`
remount fix already landed on `next`, and the shell gate survives both
models. What's actually at stake in the decision is the value tier's
async-crossing surface (`asyncArg`, the async-read wrap) and the ledger
*engine* (commit funnel, epoch memos) — mergeable as designed if the hybrid
stands, deletable without archaeology if generator-only wins.

## 9. Current lean (recorded 2026-08-05, not ratified)

The reactive pole, for the reasons §7 establishes: efficiency and
waterfall-freedom by construction rather than by optimization; the shortest
build distance from shipped machinery (the differ is the generator pole's
large unbuilt artifact; live holes are an extension of the ledger); it
subsumes every motivating example at equal or finer wire granularity; and
it achieves the same semantic uniformity as generator-only (holes and args
live for the response window — the cliff dies either way) without deleting
server reactivity and the container roadmap with it.

Two clarifications that de-risk the lean:

- **It does not preclude diffs — it contains them.** Diffing consecutive
  emissions of a hole is a per-hole transport upgrade, adopted where
  measurement earns it. Hole scope dissolves the differ's hardest problem:
  addressing is hole-relative, fill ranges are already fences, and
  snapshot re-emission is the self-healing resync. The generator pole
  *needs* its differ to be efficient; the reactive pole treats it as an
  optional endgame.
- **It does not preclude generator authoring — it demotes it to sugar.**
  An async generator feeding a hole through an iterator memo IS the
  imperative streaming experience. If demand proves out, the authoring
  form can be offered later without a second component kind or a second
  liveness semantics.

The one argument that survives on the generator side is teaching: "no
server reactive semantics at all" needs no explanation, and server
reactivity does. Weighing that simplicity against
efficiency-by-construction is the philosophy call, and it is the project
owner's, not this document's.

**Transport-indifference (the non-terminating extension).** The pole
separates authoring (holes over async sources), liveness (the ledger bound
to a sink), and transport (what carries the sink's emissions) — so
"response window" is really *sink lifetime*. If `"use server"` transport
becomes configurable (SSE, or anything connection-shaped), non-terminating
live components fall out of the SAME authoring API: a counter that stops
at 10 and a subscription that never stops are the same source code. The
long-connection hard problems are already solved by existing machinery:
reconnection is re-invocation (same address, fresh call, new version, full
snapshot, morph — snapshots are self-healing, so no event replay or
Last-Event-ID bookkeeping); slow clients get the sweep's equality-gated
latest-wins coalescing; disconnect rides abort-on-unmount; `complete`
simply never fires. The line that must hold is a discipline, not a
mechanism: **the live graph must be a re-derivable projection of durable
state (pub/sub, changefeeds, watches), never the source of truth** — the
LiveView failure mode (state existing only in one connection's process) is
what "no server sessions" continues to forbid, and reconnect-as-
re-invocation enforces it visibly in development. This refines case 3's
channel rejection rather than contradicting it: bounded per sink lifetime,
re-derivable across them.

Practical consequence if the lean holds: DR-2 un-holds. Under
generator-only the branches were potential dead weight; under the reactive
pole they are the foundation the hole ledger extends. The merge plan
resumes as sequenced (freeze → matrix → DR-2), with live holes as the next
stage on top.

## 10. The t=0 face: document SSR, where the server is the consumer

Everything above tells the call-driven story — a client mount consuming a
frame stream. At t=0 the server is the consumer too: the document render
invokes the server component inline (`frameTransformDirectResult`,
document-mode slot props) and the client *adopts* the result at hydration.
This section records how liveness translates there, because the constraint
is hard and it binds BOTH poles equally.

**The constraint: flushed markup is immutable.** SSR schedules flushes;
once a chunk is written, no server-side mechanism rewrites those bytes.
Live *data* survives t=0 anyway, because it never depended on markup: an
async slot arg serializes into the document's data scripts, seroval keeps
patching records over the still-open document stream, and the adopted
client's read settles from the record. Live *elements* cannot work that
way — a hole's markup is already in the browser as V1 bytes.

**The story: markup is the snapshot, liveness is client-applied.** The
morph can't happen in the document, so it happens in the adopted client,
fed by the channel the data already uses:

- The document renders each hole's V1 value as markup — write-once,
  unchanged.
- Subsequent re-emissions ride the still-open document stream as
  html-valued data records. The precedent already ships: `sc:region:`
  records serialize a *promise* of their html and the hydration serializer
  patches the record when it settles. A live hole generalizes that from
  "promise of one html" to "stream of html snapshots."
- The adopting client claims V1 markup, then reconciles against the
  record's latest state: patches that landed before hydration apply as a
  catch-up morph immediately after the claim (the same move a rebind makes
  when an in-flight stream morphs in); patches after hydration morph live,
  identical to a late frame chunk.

The claim itself always targets V1 — the markup that shipped — with later
versions applied as post-claim morphs, never folded into the claim. This
is the first-value lock's reasoning wearing its t=0 face: hydration's
replay must match the bytes on the page.

**The hydration complexity is reabsorbing the deduped templates.** This is
where single-copy bites back. The page markup never shipped as data (the
claim IS the transfer), so the adopted frame's store has no html record to
morph against — the V1 DOM itself is the baseline, and adoption must
reconstruct the morph substrate from page bytes: hole positions from
markers, slot ranges from their comment fences, region boundaries from
their frame elements. One requirement falls out: hole markers must be
EMITTED in document renders of server components. The "runtime-gated, no
document-SSR byte changes" rule from §7 therefore carries a qualifier —
a document render of a server component is a frame-flavored render (it
already flows through `frameTransformDirectResult`), so it arms markers;
plain app SSR outside a server component has no holes and stays
byte-identical.

**Document lifetime is policy, not mechanism.** The document response
closes when its work settles. A hole whose source finishes (the in-flight
LLM generation) holds the document stream open exactly as long as a
call-driven response would, then latches at completion. A genuinely
non-terminating source needs the transport-indifference handoff (a
follow-up stream or SSE resume under the same address) — the §9 extension,
now with a t=0 face. The default without a handoff is: latch at document
completion.

**This does not differentiate the poles.** A generator component mid-yield
at document flush has the identical problem: flushed markup is its V1
yield, and later yields need exactly the same data-channel-patches +
post-adoption-morph answer. t=0 is a shared constraint with a shared
shape, so it doesn't move the §9 lean — but any ratified design must
implement this section, not just the call-driven story.

**Current state** (probed, then completed —
`document-face-arg-tiers.spec.tsx` in the solid-web server suite):
not-ready args already worked at t=0, coarsely — the throw propagates
into the server component's own `<Loading>`, the section defers as a
fragment, and the retry delivers the settled value in markup (the
"holding" alternative DR-2 rejected for the stream face, functional
here). The value tier's document half is now plumbed: an async value
passed whole suspends at the inline read (rxcore's `ssrAsyncValue` wraps
it in a server async memo, so the fill's hole throws not-ready and the
engine re-pulls on settle), iterables tap their first yield for the read
while the record replays the full sequence — markup is the V1 snapshot,
the data channel stays live, exactly this section's shape. The Case 1
ledger still does not run on the document sink — deliberate: "the
document is a snapshot," within-response liveness is the frame render's
story, and the principles doc says so.
