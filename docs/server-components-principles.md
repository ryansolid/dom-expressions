# Server Components: The Derivation

**Status:** Accepted design basis for the post-`0.50.0-next.35` architecture pass.
**Audience:** anyone changing `frame-client.js`, `frame-transport.js`, `frame-sink.js`, the
document inline scripts in `server.js`, or Solid's frames integration
(`@solidjs/web/frames`, `solid-js` hydration).
**Relationship to other docs:** [`server-components.md`](server-components.md) is the
usage-first spec, [`frame-streams-rfc.md`](frame-streams-rfc.md) is the wire format.
This document sits underneath both: it states the axioms the system is derived from,
maps every existing mechanism to the axiom it serves (or marks it compensatory), and
records the decisions of the first-principles pass. Where this document and the older
docs disagree, this document wins and the others get revised.

---

## 1. Why this document exists

The feature was specified by invariants (single-copy, hydrate-once, per-args identity,
state survival) but *implemented* by accretion: each bug got a locally-correct fix, and
several fixes created the conditions for the next bug. Three seams paid interest
repeatedly:

- **Reveal/claim ownership** needed fixes three rounds running — solidjs/solid#2964
  (late-settling boundary never mounts), then the reveal-policy rework (`_$HY.f`),
  then solidjs/solid#2967 (the rework changed what `_$HY.done` means, breaking
  `documentStreaming()`; plus a claim scope severing slot reactivity). Each fix was
  correct and each spawned the next, because *two* runtimes (document hydration and
  the frame client) own the same placeholder vocabulary.
- **Record shape per transport** produced the #547 cluster (`#refArgsUnchanged`, the
  `ctx.adopted` fork, `hy.r` absorption) and then solidjs/solid#2968 (adopt-time slot
  sync can run before its record is resolvable, misclassifying an invoked slot as
  argless content).
- **Boundary identity straddling cache and call site** produced the hover-preload
  morph bug, the sidebar-collapse bug, solidjs/solid#2965 (fast navigation permanently
  showing the wrong route), and the machinery stack that fixed them: call-site
  handoff, `forwards`, `rebind`, retention snapshots, live slot props, and the
  "preloads never hand off" rule.

Meanwhile the client surface reached ~3,400 lines / 8.5 KB min+gzip and the CI size
ceiling was ratcheted upward nearly every round. Ratcheting a guard to match actuals
is the guard failing.

The async work in Solid 2.0 established the antidote: state the axioms, derive the
mechanism set from them, and delete everything that exists only to compensate for a
mechanism that shouldn't exist. This is that pass for server components.

---

## 2. Axioms

Everything below is derived from these seven statements plus one liveness rule. A
mechanism that cannot cite an axiom is a bug in the architecture even if it fixes a
bug in the behavior.

- **A1 — Single-copy.** Server content travels exactly once: as HTML if it is
  markup, as a data record if the client needs the value. Never both. (At t = 0,
  values recoverable from the rendered page are recovered, not re-sent.)
- **A2 — Hydrate once.** Client components hydrate at t = 0 and never again. After
  boot the server never renders a client component; post-load responses carry server
  content and slot records only.
- **A3 — Addresses key content, not mounts.** Every byte the server produces belongs
  to a `(function, arguments)` address. Arrival — any transport: preload, refetch,
  single-flight region, document inline — *only writes the address's store*. There is
  no code path from arrival to DOM.
- **A4 — Sites own mounts.** A consumption site owns one mounted frame, bound to one
  address at a time. DOM changes are pulls: the bound address's store advanced a
  version, or the site rebound to a different address. Binding follows the site's own
  reactive expression, nothing else.
- **A5 — One record shape.** A slot/region record has one meaning and one
  availability point on every transport. The t = 0 document emits the same records a
  stream would; a consumer never branches on "how did this arrive."
- **A6 — One reveal owner.** A pending placeholder has exactly one owner: the frame
  store/flush model. The document is the t = 0 frame (id `""`), not a parallel
  system with its own policy.
- **A7 — Identity-first matching.** Occurrence identity is frame-wide. Reconciliation
  matches client-owned ranges by identity first and position second; a live range is
  *never* detached because of where it sat.
- **L1 — Liveness.** Every pending state resolves to exactly one of: content, error,
  or detectable truncation. Nothing pends silently forever. (This is the axiom
  solidjs/solid#2958 showed was missing: a truncated stream must be observable, and
  the `_$HY.fe` seam it relies on must actually exist.)

A1, A2 are unchanged from the shipped design and have never been the source of a bug
class. A3–A7 and L1 are the corrective ones.

### The derived data flow

```
  preload ──────┐
  refetch ──────┤ writes                    pulls (bound address, version)
  single-flight ├──────► store[(fn, args)] ◄──────── mounted frame ──── site
  t=0 document ─┘                                        (one per site)
```

Preload isolation, retention, and "morph on refetch" stop being rules anyone
maintains; they are unrepresentable-failure consequences of A3/A4:

- A hover-preload for `getNote(2)` writes `store[getNote,2]`. The viewer is bound to
  `store[getNote,1]`. Nothing observes the write. (The hover-morph bug cannot be
  expressed.)
- Navigating rebinds the site's frame from address 1 to address 2 — the same morph
  path as a version update on a bound address. If `store[2]` is warm, the morph is
  synchronous: that *is* retention, with no snapshot mechanism.
- A refetch of the bound address advances its store version; the frame pulls and
  morphs. Client-owned ranges survive by A7.

---

## 3. Decision records

### DR-1: The identity split (supersedes "boundary identity is the call", contract §3)

**Shipped design:** the `(function, args)` address keys *everything* — the component
identity `dynamic` sees, the DOM boundary element, and the content store. Every args
change is therefore a component swap, which is a remount — so the design immediately
needed machinery to undo the remount for live sites: `COMPONENT_HANDOFF` (a brand the
new component uses to steal the old component's live mount), the path-compressed
`forwards` map, `FrameImpl.rebind` (change a live frame's id without teardown),
retention snapshots (a departing boundary stashes `{version, records}`), and an
explicit rule that preloads never trigger handoff. That stack is where the
hover-preload bug, the sidebar-collapse bug, and solidjs/solid#2965 lived.

**Previously rejected design (for the record):** one boundary per call *site*,
owner-captured, morphing across argument changes — with the *cache* keyed by site.
Rejected correctly: a fresh per-args cache hit could resolve a component that was
mounted showing different arguments' content. That failure was a cache-honesty
violation.

**Adopted design:** split the two roles the address was playing.

- The **store** is keyed per-address (cache-honest; 1:1 with a data layer's per-args
  cache entries by construction — the half of the shipped design that was right).
- The **mount** is keyed per-site. The component `dynamic` resolves is stable per
  *function*; args changes at a live site deliver a new binding to the same instance
  ("same component, new props" — the semantics compiled components already have),
  and the instance's frame rebinds its pull to the new address's store.

The rejected design's failure mode is unrepresentable here: a cache hit fills a
per-args store; a mount bound to a different address never observes it. The shipped
design's machinery is unnecessary here: there is no component swap to undo, so
handoff, forwards, rebind-by-id, retention snapshots, and the preload rule all
delete. What remains is the one genuinely-needed mechanism the patches were
approximating: a "new binding into the same live instance" delivery path — the same
shape `liveSlotProps` already has one level down, now applied at the boundary level
where it belongs.

State semantics are preserved exactly: slot occurrences whose ids persist across a
rebind keep their client state (what the collapse-bug fix was reaching for);
occurrences that disappear unmount (per-call state does not bleed across calls);
teardown is still disposal, never a version bump.

### DR-2: Async values at the slot border

**Where a read renders determines where it suspends.** A read rendered into
*markup* suspends on the server, into the fragment model — `Loading`,
placeholders, deferred reveals — because that is where a placeholder exists
by construction (DR-3). A read crossing as a *slot arg* never suspends the
server: the stream, the record, and every sibling arg ship immediately, and a
value that isn't ready yet crosses *as* pending. Suspension for data is
**client-side, at the consumption read** — a prop read through the live-props
proxy follows the normal async read path into the reading component's own
nearest `Loading`, exactly as a promise prop behaves between two client
components. Initial SSR's shape, applied to data: emit now, settle later,
reveal at the read site.

"Nearest `Loading`" is a **border-blind search**, and that is what makes the
no-boundary case already solved rather than a new hole. The frames client
reconstructs a client `Loading` at the seam of every server `<Loading>` it
reveals (`revealSeam`), precisely so a client fill that suspends top-level
without a boundary of its own defers to the *server's* boundary. The first
design deferred such fills to the parent *client* boundary outside the slot
instead, and was walked back: that boundary has already latched by reveal
time, so the suspension either re-collapses settled UI around the slot or
orphans entirely, and it answers with the wrong fallback — the server
already rendered the fallback for exactly this footprint, so the client
must hold *that*, at *that* granularity. (Pinned: the seam test asserts the
segment fallback holds while the outer fallback must **not** re-engage;
`boundaryScope` guards the ownership half — re-parenting a fill to the
frame's outer owner would let it escape the seam boundary that exists to
cover it.) A pending slot arg read at mount is just one more way top-level
suspension arises, and it escalates by the same path: the author's server
`Loading` covers unboundaried pending *data* exactly as it covers
unboundaried fill *markup*. One boundary tree spans both owners; what
differs across the border is who rendered the fallback, not where suspension
resolves. DR-2 completes the picture that seam decision started — together
they mean an author places boundaries by UX intent alone, never by which
side a value happens to arrive from.

**Data args are live bindings for the response window.** No node kind is
special: from the graph's perspective an expression, a sync memo, an async
memo, and a projection are all equally downstream of sources, so the border
must not draw a liveness cliff between them. (An earlier draft's "only
self-driving primitives stream" drew exactly that cliff — it described the
server implementation's shape, not the model's, and is superseded.) The
mechanism buys graph-consistent behavior without building a dependency graph
into SSR mode:

- At record emission, each arg getter becomes an open **binding** —
  `(record, arg, getter, last emitted state)`. Nothing holds; the record
  ships with its mix of settled values and pending marks. The server side is
  a binding ledger, not a boundary — the suspense boundary is the client
  component's own `Loading` at the prop read.
- The server has exactly one kind of update event: a **commit** — a generator
  yields, a promise settles — already funneled through the settlement choke
  points. Each commit bumps a global **epoch** and triggers one
  equality-gated re-evaluation sweep over the open bindings; changed values
  re-emit as ordinary live-props record updates. Between commits nothing
  runs: correctness by re-evaluation instead of by tracking, over the
  dumbest possible topology (sources → all bindings) — the right trade at
  SSR scale, where response windows are short, commits few, getters cheap.
- Server memos cache **per epoch** (one integer compare at pull; no
  subscriptions), so derivations recompute lazily when a sweep pulls them.
  Memos are pure by contract; re-running per epoch is the client contract
  applied to the server.
- **Lifecycle:** a binding opens at emission, updates on commits, and closes
  at response completion or region teardown. Completion latches the last
  value as final — principled, not truncation: the request-scoped graph is
  disposed, so its last value *is* its final value. A binding that never
  successfully evaluated **rejects** with a diagnosable error (the fragment
  ledger's truncation pattern), so a client `Loading` errors instead of
  hanging. Cross-request updates are owned by re-invocation (invalidate →
  the address re-streams → live props update the mounted instance).
  Unmounting the frame aborts the in-flight response, which disposes the
  sources — no new teardown protocol.
- Implementation notes settled in review: equality gating is *reference*
  equality (a getter minting a fresh object re-emits per commit — exactly
  what the client graph does with that getter; structural comparison would
  be a silent divergence); sweeps coalesce per flush (a burst of yields in
  one tick is one sweep, at most one emission per binding); a binding that
  emitted and later throws not-ready re-enters pending as
  pending-with-previous-value — the client async source already models
  latest-vs-suspend; bindings ride the sink's existing response-window
  context (it already holds projection taps and deferred holes), and a
  superseded region closes its bindings mid-response.

Classification (by the value's nature, before resolution — DR-3) decides each
binding's **wire shape**, never its liveness:

1. **Plain values** — including the results of expressions
   (`value={proj.a + 1}`) and sync memos: the value itself; re-emissions
   replace it, latest-wins. Pending-at-first-evaluation ships as a pending
   async value and resolves on a later sweep.

2. **Async values passed whole** (promises, async iterables, async memos):
   a pending record streams on, resolutions/yields ride later data chunks
   (seroval's streaming serialization is already this shape). Revives as a
   client **async source**; reads suspend at consumption. The receiving side
   already exists (the signal-backed live-props proxy plus the async read
   path) — this tier ships first.

3. **Containers passed whole** (projections and stores, or *parts* of them)
   cross as their **bounded async trace**: one snapshot, then patch batches,
   for as long as the response is open. Committed work, not demand-gated —
   solidjs/solid#2966's repro *is* this crossing.
   - *Why a trace and not a channel:* the server graph is request-scoped, so
     a reactive value's entire observable life fits inside the response
     window; a channel bounded by the response IS streaming serialization,
     and one that outlives it would require server sessions this
     architecture does not have. The binding lifecycle above applies
     unchanged — settle-at-completion, re-invocation for cross-request
     updates, abort-on-unmount.
   - *Why patches and not snapshots:* seroval dedupe is identity-keyed and
     in-place mutation keeps identity while changing content, so
     snapshot-per-frame back-references pin *stale* serializations.
     Immutable updates make snapshots cheap; in-place updates make patches
     cheap — Solid chose in-place, so the aligned wire format is the
     mutation log, which is also the single-copy answer: snapshot once,
     deltas after.
   - *The producer already ships:* projection hydration wraps the draft in a
     `PatchOp`-recording deep proxy (set/delete/array-splice ops by
     root-relative path) and serializes a tapped async iterable — one full
     snapshot, then `patches.splice(0)` per yield — consumed by
     `applyPatches`. It doesn't fire at this border only because its gate is
     the hydration-owner record path (`ctx.serialize(owner.id, …)`), which
     `NoHydration` — where server components render — correctly blocks.
   - *Hydration's trace, the frame store's envelope:* the trace is reused;
     hydration's transport identity is not. At the border it is addressed as
     `(occurrence, arg)` inside the slot record — a capability of the
     record, not a registry entry — version-gated by the store's existing
     discipline (a superseding stream's arrival means the old version's
     pending patch batches are *dropped*, never applied), and lifetime-bound
     to region teardown. The snapshot serializes through seroval directly
     (hydration's JSON-clone freeze would sever shared references within a
     record).
   - *The receiver is minted:* unlike hydration — where the client's own
     `createProjection` call is the patch target because the same component
     code runs on both sides — no user code runs on the client here, so the
     frames integration mints the counterpart: `createStore(snapshot)`
     pumped by `applyPatches`, handed to the live-props read. Fine-grained
     client reads work because it *is* a store.
   - *Parts ship as what you pass.* A nested node of a projection is itself
     a store proxy, so classification sees it; the unit that crosses is the
     passed subtree, never its root — the wire is an exposure contract
     (`{ first: state.items[0] }` must not leak siblings/ancestors), which
     rules out the hydration-equivalent root-reference design despite its
     free aliasing. Each arg gets a server-side filtered/rebased view of the
     one root-relative trace: ops strictly below the arg's path strip the
     prefix; an op at or above it projects the new value down as a sub-store
     root replacement (`[[], v]`); ops elsewhere are dropped *before* the
     wire. A part whose ancestor is deleted settles at its final projection.
     Overlapping parts are independent containers — share identity by
     passing the common ancestor once (also the cheaper wire).
   - *"Serialize what is read" holds at the author's granularity:* the
     client's reads happen after the server is gone, so narrowing to them is
     impossible without SSR-ing the client component or a demand-fetch
     waterfall against a disposed source. The projection (or passed part)
     is the author-declared read set and snapshot+deltas its minimal
     encoding — "ship less" = "project less," and passing a part is
     projecting less ad hoc. Single-copy is preserved because the record is
     the only copy when the client is the only consumer; render-AND-pass
     duplication is the authored, bounded concession DR-3 rule 2 names.
   - ***Build record (2026-08-10).*** Shipped as designed. The identity
     rationale that settled the wire format, recorded: granular patches
     carry **framework-owned identity** (root-relative paths recorded at
     write time by the producer's own proxy — never computed by diffing),
     which is what rules out the snapshot-plus-reconcile alternative:
     reconciliation needs domain keys the framework cannot assume, while
     the mutation log needs none. The letter was refined in four places
     the build discovered:
     - *The trace is multi-consumer.* Hydration's single-consumer tap became
       a shared pump: one source iterator drives an append-only patch log,
       and every `subscribe()` (hydration resume, each slot crossing) replays
       from its own cursor — snapshots captured only at stable points (no
       in-flight `next()`), so undrained writes can't double-apply.
     - *The receiver is a minted projection, not a bare store.* The client
       materializes the trace through `createProjection` under its own root:
       the container REFERENCE is available synchronously, reads INTO it
       suspend until the snapshot (the fill's own `<Loading>` covers them,
       same contract as the value tier), patch batches apply through
       `applyPatches`, and the result is readonly — writes stay
       producer-owned by construction.
     - *The envelope.* Seroval's own classification runs before plugin
       tests — it reads `.constructor` (detonating a pending proxy) and
       claims arrays outright — so raw containers can't be intercepted
       reliably. The sink swaps each traced container, at any depth of an
       argument, for a module-private `{ [TRACE] }` envelope (copy-on-write
       walk) and the plugin matches THAT. On the document face the record
       carries a `{ $tr, $ta }` marker literal instead, revived at arg-read
       and memoized per trace — one live container, however many references.
     - *Classification is trap-safe on BOTH faces, containers first.* The
       server probes by WeakMap (`isContainerTraced`) before any content or
       async probe; the client mirrors it by WeakSet
       (`isMaterializedContainer`) in the props proxy and the record-dedupe
       compare — where containers compare by identity only (same
       materialized instance adopts silently; a re-serialized trace is a new
       generation, a live-props change). The matrix surfaced this as a real
       gap: `.then` probes and serialization compares detonate pending
       containers.

     Scope lines, recorded: this round crosses **whole containers**
     (settled plain stores still ship as plain data — the trace registry
     only claims async projections). *Parts* (nested-node exposure with
     filtered/rebased traces, above) and *case 4* (async at container
     paths) remain the designed extensions; a part of a PENDING projection
     is not yet classifiable and must not be passed. And the write
     discipline stands as documented but **unenforced**: raw reactive
     writes during server render are wrong for ordinary SSR already
     (the markup may have flushed); enforcement is parked with case 4's
     diagnostics, not a Stage 5 deliverable.

4. **Async at container paths** (promises/pending nodes stored IN a
   projection): two clocks interleave at one path — the mutation log (a path
   may be reassigned before its promise settles; a superseded settlement must
   lose, so per-path latest-wins sequencing) and the settlement events
   ("pending" is a node state, not a value: minted-store reads of such paths
   must suspend through the async read path, and the sink must serialize from
   the raw target so a pending node cannot suspend the serializer). Excluded
   from the first container round with a diagnosable error naming the path;
   the sequencing discipline is designed into the container spec so this is
   an extension, not a retrofit.

5. **The serializer never crashes.** An unserializable value is a diagnosable
   error naming the slot and the type, not `Seroval Error (step: 1)`
   (solidjs/solid#2966's presenting symptom). With cases 1–3 unwrapping
   reactive values into their traces, this remains only as the guard for
   genuinely unserializable *outputs*.

Rejected alternatives, for the record: **holding** (deferring the slot record,
or the stream, on one arg — coarse, and contradicts case 1's granularity);
**resolving passed primitives server-side to dead values** (two suspension
sites for one kind of data, and updates the source produces later in the
response would be dropped); **write-once expressions** (settle at first
successful evaluation, then latch — a liveness cliff between `value={memo()}`
and `value={memo}` that no client border has; superseded by response-window
bindings); **persistent channels** (duplicate re-invocation with worse
lifetime semantics); **snapshot-per-frame dedupe** (stale back-references,
above). Server-content async (`<Loading>` inside server JSX)
is a different async and keeps the fragment model wholesale: one is markup the
server owns, the other is data the client owns.

**Status — the value tier (case 2) is implemented** (`dr2-value-tier`
branches, dom-expressions + solid, verified end-to-end in the chat example):

- *Server:* the record never waits — promises and async iterables serialize
  through the codec as pending data refs (seroval streams resolutions/yields);
  a not-ready thunk ships via retry-until-settled and rejections ride the data
  channel, never the stream face.
- *Client:* the slot-props proxy routes an async-valued prop through a lazy
  async memo under the occurrence's owner, so the read suspends into the
  covering boundary and, for iterables, IS the latest yield thereafter. Fresh
  call-driven mounts shell-gate (the covering `Loading` holds until the
  frame's first apply — content or error), giving a t=0 fill's pending arg
  read its boundary.
- *Typing:* `Slot<P>` deliberately keeps the fill's props settled;
  `asyncArg<T>(...): T` is the identity that types the async value at the
  border (widening `Slot`'s parameter would leak async unions into every
  fill's contextual typing).
- *Found under it:* signals' iterate loop assumed protocol-strict iterators;
  seroval's deserialized streams return buffered steps as bare
  `IteratorResult`s, which crashed the graph — fixed on `next` with
  `for await` assimilation semantics (plus the latent post-gap sync-settle
  drop). The value tier's consumption path depends on that fix.

**Status — the document face (t=0) has the value tier.** Everything
above was built call-driven-first; `createDocumentSlotProps` (the t=0
face, where the *server* is the consumer and the fill renders inline into
the document) predates DR-2, so its behavior was probed empirically and
then completed (`document-face-arg-tiers.spec.tsx`, solid-web server
suite; the shim-backed twins in the runtime's own
`frame-server-component.spec.js`):

- **Not-ready args were already handled — coarsely.** A thunk/getter
  throwing not-ready at the unwrap, or an eager call suspending in the
  component's render, propagates into the server component's own
  `<Loading>`: the section defers as a fragment and the retry delivers
  the settled value in markup. This is the "holding" alternative DR-2
  rejected for the stream face's granularity — the whole section holds
  instead of pending marks per arg — but at t=0 it is functional,
  orphan-free, and consistent with "markup is the snapshot." (One
  artifact: the retry re-invokes the slot, so the occurrence renumbers —
  markers and record stay consistent with each other.) Pinned as passing.
- **Async values passed whole now suspend at the inline read.** The
  document face wraps them in a full async-aware memo (rxcore's
  `ssrAsyncValue`, implemented over the reactive core's server memo): the
  read throws not-ready into the engine's hole machinery — the covering
  boundary holds, the re-pull delivers the settled value in markup — and
  since the throw happens in the *fill's own* template hole, the holding
  is finer than the thunk case's whole-section defer. The record is
  untouched: the async value itself still ships there, its resolution
  streaming through the document's data scripts, so page markup and the
  adopted client's read now agree (previously the markup shipped an
  empty hole over a raw promise read — a hydration mismatch).
- **Async iterables tap their first yield** — one cursor, two consumers:
  the inline read settles on the first yield (markup is the V1 snapshot;
  later yields are the adopted client's story, per §10 of
  generator-only-model.md) and the record ships a replay wrapper that
  re-yields it before delegating, so the client still receives the
  complete sequence. This is the first-value lock's semantics arrived at
  from the transport side.

Mode invariance holds at the border: the same authored crossing behaves
identically whether the mount is call-driven or the initial document.
The Case 1 ledger still does not run on the document sink — deliberate
("the document is a snapshot"; within-response liveness is exclusively
the frame render's story) — and the matrix's document-adoption suite now
carries the arg-tier rows on both halves (the inline server render and
the adopted client's record read).

**Status — case 1 (expression bindings) is implemented**
(`dr2-expression-bindings` branches, stacked on the value tier, verified
end-to-end through Solid's SSR compile). The watched tier is live: `<props.slot
thing={thing()} />` — the compiled getter, the common authored form — now
re-evaluates at every commit the response observes and re-emits the
occurrence's record when the value changed, for the response window. What
shipped, against the design above:

- *The ledger rides the sink*, as designed: bindings open after the
  occurrence's record emits, for every re-runnable arg that classified as
  data — compiled getters (captured from the property DESCRIPTOR, which also
  fixed a latent crash: a not-ready getter re-thrown from the classifier's
  catch killed the stream), author thunks, memos passed whole. Eagerly
  evaluated call-expression args (`props.slot({ thing: thing() })`) stay
  write-once — JS evaluated them before the border, same as any client call.
- *The commit funnel needs no dependency graph*, as designed, but its choke
  points are two, not one: settlements the sink already SEES (a data flush —
  a serialized promise resolving, an iterator yielding; a fragment
  resolving; a pending arg's retry succeeding) schedule the sweep directly,
  and settlements a server-owned render makes INVISIBLE (noHydrate
  serializes nothing — the HTML is the data) reach it through a `ctx.commit`
  hook the frame render installs and the reactive core pokes at its settle
  sites. Sweeps coalesce per microtask, bump the epoch once per batch, and
  are reference-equality gated per binding. Refs MINTED by sweeps are
  excluded from the funnel, so a getter returning fresh identities re-emits
  at most once per real commit instead of looping the response.
- *Server memos cache per epoch*, as designed, with one precision the design
  glossed: epoch recompute applies to **sync-valued** computes only (the
  sync memo path and full memos whose last result was plain). Async memo
  values advance through their own settle machinery — re-running them would
  mint new promises/iterators. Iterator memos get their liveness from a
  **ledger-gated pump**: in a server-owned render nothing consumes the
  iterator past the first value (there is no serialization tap), so when —
  and only when — `ctx.commit` exists, the core keeps pulling, advancing the
  memo's value and committing per yield. The pump never HOLDS the response;
  completion latches the last yielded value.
- *Document SSR keeps the first-value lock, deliberately.* The tapped
  (hydration-serialized) iterator path still never advances the memo's
  value: markup rendered from V1 must keep reading V1 or a mid-stream
  boundary retry bakes V2 into HTML the client claims against V1's replay.
  Within-response liveness is exclusively the frame render's story, where no
  hydration claim exists. This is the one place case 1 is narrower than "no
  liveness cliff anywhere": the cliff at t=0 document SSR is hydration's
  consistency requirement, not a missing engine.
- *Re-emission is wire-only, as predicted:* re-emitted records ride the
  existing slot-record protocol (changed scalars inline; changed objects
  under write-once VERSIONED refs, `arg:<occ>:<key>@<n>`), the client's
  live-props path applies them, and the value-tier async wrap already reads
  a re-shipped pending ref as suspend-with-latest — settled → not-ready
  re-enters pending-with-previous exactly as specified. The end-of-response
  latch runs one final synchronous sweep before `complete`, so a commit in
  the last flush still ships.
- *Two lifecycle edges intentionally deferred:* a superseded region does not
  yet close its bindings mid-response (the enclosing response's sweeps just
  find them equality-stable), and a never-successful binding HOLDS
  completion through its serialized pending ref (the value tier's existing
  semantics) rather than rejecting at truncation — the diagnosable-reject
  pattern remains the design for abort/timeout handling when that lands.

Case 3 (container traces) is built — whole containers on both faces, per
its build record above. Case 4 (async at container paths) and the parts
extension remain design-settled, not yet implemented; case 5's
diagnosable-error guard exists for function args and unserializable
outputs at the record path.

The load-bearing distinction the value tier left ("live = self-announcing,
latched = watched") is retired: watched values — memo reads, expression
evaluation, state mutated by async settles — are live within the response
window through the ledger, which was the missing engine. Async memos are now
fully in the shipped column: whole or evaluated, first success ships and
later commits re-emit. What remains latched is only what the design says
must latch: values crossing at t=0 document SSR (hydration's first-value
lock — since upgraded by Stage 4's `sc:live` channel, which makes the
document face live within its own response window; see §9) and anything
after the response window closes (cross-request updates are
re-invocation's, by architecture).

**Ratified: liveness is exclusive to the slot border — markup holes settle
once.** *[Superseded 2026-08-07 by the reactive pole (§9): live markup
holes generalize the ledger to insert positions, built as Stage 3
(call-driven) and Stage 4 (t=0). What survives of this record is its
boundary conditions — the explicit-authoring concern is answered by holes
being commit-driven and impurity-gated rather than implicit re-renders,
and the "value at render time" / document first-value-lock analysis below
carried forward into Stage 3/4's latch semantics.]* `<p>{iterMemo()}</p>`
in server component markup renders the value
the hole resolved with and never retro-updates; only slot args get the
ledger. The line is ownership, not implementation budget: a slot arg crosses
into the client's LIVE reactive graph — something exists on the other side
to apply an update, and re-emitting a record is a value update. A flushed
markup hole has no live consumer; "updating" it means re-rendering and
re-shipping markup, which is not an update but a NEW RENDER — and markup
that advances is deliberately an explicit authoring form (the
progressive-emission proposal's generator components, one snapshot per
yield), never an implicit property of reading an async value in JSX.
Implicit markup liveness would hold responses open and re-ship HTML without
any author intent visible in the code. The author story has no dead ends:
ticking *data* passes the async value through a slot arg to a client fill;
ticking *markup* is a generator component. One precision: within a frame
response "first value" means **value at render time** — a fragment that
renders late reads the memo's then-current value (the pump may have advanced
it), which is client time-semantics (a later render reads later state).
Document SSR alone pins the strict first value, because hydration's replay
starts at V1 and the claimed markup must agree. Two consumers, two
consistency contracts, each matching what is alive on the other end.

### DR-3: Classification precedes resolution (template detection stays tractable)

Two rules keep the sink's content-vs-data decision and reverse templating decidable:

1. **Async slot args are data-only.** The wire shape — an HTML placeholder in the
   stream vs. a data chunk — is fixed at markup-emission time; a placeholder cannot
   be inserted retroactively after surrounding markup has flushed. Therefore a value
   that cannot be classified synchronously is data by definition: async slot args
   must resolve to serializable values, never JSX. Async *server content* goes
   through `Loading`/fragments, where the placeholder exists by construction.
   (Function-valued args keep the existing "resolve, then classify" treatment — they
   *can* be resolved synchronously.)
2. **Async args are never reverse-templatable.** Rendered markup shows a settled
   value; the async wrapper type (`Promise`? projection? plain value?) is not
   recoverable from content. Async args always ship as typed records. This is a
   bounded single-copy concession (the settled value may appear in both markup and
   record when the wrapper's value is displayed), accepted because inferring wrapper
   types from markup is precisely the kind of guessing this pass exists to remove.

### DR-4: The document is the t = 0 frame (one reveal owner)

The document inline scripts (`$df`, `$dfl`, `$dfs`/`$dfc`, the deferred/held queues)
and the frame client (`#segmentReady`/`#revealSegment`/style gating) are two
implementations of one concept: *a keyed pending segment with prerequisites,
revealed when ready*. The dual ownership is what made "who may swap this
placeholder after hydration is done" unanswerable — #2964, the `_$HY.f` policy
patch, and #2967's `documentStreaming()` breakage are all this seam.

Adopted: **one buffer, one consumer.** The inline bootstrap stays a dumb recorder
(tiny, no policy): fragment arrivals, style counts, and data records go into the
buffer exactly as they do today. The frames store/flush model becomes the *only*
consumer: at runtime boot, document state drains into frame `""`'s store, and every
reveal — document fragment or frame segment — is the same readiness predicate
(content present + structural prerequisite + declared deps + style gate) evaluated
by the same flush. Boundary claims are store reads by the owning boundary, not a
side-channel policy negotiated between two runtimes. `_$HY.done`, the fragment-claim
registry, the held-fragment replay, and `boundaryMayArrive`-style heuristics all
dissolve: "may this swap apply" becomes "is this write's owner bound," the same
question every other store write answers.

**Stage 3 refinement — the buffer is a ledger, not a frame instance.** Two
constraints sharpen the implementation without weakening the axiom. First, the
0 B non-consumer budget (§6): plain streaming apps use document fragments
without importing frames, so the one consumer for *document* fragments must
live in the hydration runtime, not the frames bundle — frame segments keep
`#revealSegment` for frame transports (disjoint content, same model). Second,
the record set that answers "what may the document still deliver?" already
mostly exists: the serializer's `<id>_fr` writes are the DECLARATIONS, seroval's
`.s` status marks are SETTLEMENT, and one added inline mark (`_$HY.v[id] = 1`
in `$dfr`, recording — not policy) is REVEAL, valid across the pre-boot window.
The hydration runtime owns the ledger (declared → settled → revealed, plus its
post-boot claimed/held policy state) and publishes it as `_$HY.fr`
(`{ pending, subscribe }`): the frames client's document adoption reads
"may a boundary still arrive" and learns of reveals from the ledger — the
`pl-*` document scans and the `_$HY.fe` monkey-patch delete. One scoped residue:
a settled-but-unswapped fragment (style-gated, retry-queued, reveal-grouped,
policy-held) reads as pending via its content template's continued presence —
a per-id `getElementById` at query time, an id-table lookup rather than the
tree scan this replaces. Pre-boot reveals stay inline mechanics ($dfr): before
the runtime exists there is no second writer, so no policy question — one
owner *at any moment* is the invariant, not one code location.

### DR-5: Identity-first reconciliation

The morph is currently position-first (two-cursor sibling reconcile) with a
frame-wide displaced-range index bolted on as a repair pass — grown across three
fixes (cross-parent relocation, teardown release, wholesale-insert restore, the
notes search-clear bug). Under A7 the index *is* the model: client-owned ranges
match by occurrence identity anywhere in the frame, and position governs only
server-owned nodes. The repair pass becomes the primary path; "a live range was
detached because its parent didn't match" stops being a reachable state.

---

## 4. Mechanism audit

Every mechanism in the current client surface, its axiom, and its disposition.
**Derived** = follows from an axiom, stays (possibly simplified). **Compensatory** =
exists to undo another mechanism's consequences; deletes with its cause.
**Presentation** = per-mount state, stays but is explicitly not content (see §5.4).

| # | Mechanism (current location) | Axiom | Disposition |
|---|---|---|---|
| 1 | Chunk→record store writes (`chunkToRecords`) | A3 | Derived — unchanged. |
| 2 | Multi-mount routing + pending buffer (frame host) | A3/A4 | **Done (Stage 2):** resident per-id stores; writes land mounted or not, mounts seed from the store. The pending buffer and sibling seeding deleted into it. |
| 3 | Retention snapshots (`snapshot`, last-unregister-wins) | — | **Done (Stage 2):** deleted — a warm store *is* retention. One residue: a last-unmount capture of a document-adopted interior (its content never rode chunks). Lifetime policy in §5.1. |
| 4 | HTTP pump (`applyFrameResponse`: `as`/`route`/restamp) | A3 | **Done (Stage 2):** responses apply as their call's address; the `route` map deleted (region roots address stores directly). |
| 5 | Version gating, policy A (stale-guard, not reset) | A3/A4 | Derived — unchanged, now explicitly per-address with client-stamped authority (§5.2). |
| 6 | Slot-record identity dedupe (`argsEquivalent`) | A5 | Derived, simplified: with one record shape the conservative `$ref` special-casing shrinks. |
| 7 | Prerequisite flush loop (`#flush`) | A6 | Derived — becomes THE reveal engine for document + frames (DR-4). |
| 8 | `frame:applied` event | — | Derived (router affordance) — unchanged. |
| 9 | Zero-allocation morph (`reconcileChildren`) | A7 | **Done (Stage 4):** identity-first (DR-5) — the reconcile records every wholesale-inserted root as a graft site. |
| 10 | Displaced-range index + stash/restore | A7 | **Done (Stage 4):** the index is the primary matching path; the O(frame) end-of-morph rescan (`restoreDisplacedRanges`) deleted into one walk over recorded graft sites (`flushGrafts`). |
| 11 | Root materialize vs morph split | A4 | Derived — unchanged. |
| 12 | Slot marker collection/parsing | A1 | Derived — unchanged. |
| 13 | Occurrence mount/re-call/unmount (`#syncSlots`) | A4 | Derived — unchanged in role; simpler inputs (A5). |
| 14 | Invoke context (`ctx`: adopted/invoked/existing/…) | A5 | Derived, shrinks: the `adopted` fork exists because t = 0 records differ (A5 removes the difference). |
| 15 | Live slot props (`ctx.onUpdate`, signal-backed proxy) | A4 | Derived — and generalized upward: the same "new binding, same instance" shape serves boundary rebinds (DR-1) and async arg updates (DR-2). |
| 16 | `#refArgsUnchanged` value-compare | A5 | **Done (Stage 2):** the #547 `$frame`-addition leniency deleted with unified records; the plain value-compare stays (it is the dedupe, not the patch). |
| 17 | `$ref`/`$frame` arg resolution + per-stream tables | A1/A3 | Derived; table scoping revisited under per-address stores (§5.2). |
| 18 | Region discovery from markup (`#discoverRegions`) | A5 | **Done (Stage 2, first half):** with A5, used regions have records on every transport; discovery remains only as claim wiring — and membership is now structural (outermost dotted id in this interior), not producer-prefix-matched, so address-keyed mounts adopt fn-id-prefixed markup. |
| 19 | Region bind/rebind/`renameRegion` (wire-id renames) | A3 | Compensatory: regions become store substructure keyed `(parent address, occurrence, arg)` (§5.3); wire-relative renames delete. |
| 20 | `hy.r` occlusion absorption (adopt-time fake chunks) | A5/A6 | Compensatory. Deletes: occluded content is ordinary records in the one buffer, drained by the one consumer (DR-4). |
| 21 | Segment reveal + placeholder discovery (`#revealSegment`) | A6 | Derived — and becomes the only implementation (DR-4). |
| 22 | Stylesheet gating + modulepreload | A6/L1 | Derived — unchanged, one instance instead of two. |
| 23 | Boundary-driven reveal seam (`options.reveal`) | A6 | Derived — unchanged. |
| 24 | Element claim sweeps (`CLAIM_SEAM`) | A2 | Derived — unchanged. |
| 25 | `<dx-frame>` element boundary | A4 | Derived — unchanged. |
| 26 | Dispose/rebind lifecycle (`FrameImpl.rebind`) | — | **Done (Stage 2):** rebind survives — but demoted from handoff protocol to delivery mechanics (the site's binding-follow effect calls it); dispose stays (teardown is disposal). |
| 27 | Address-keyed component registry (`byAddress` minting) | A3/A4 | **Done (Stage 2):** per-function components + per-address bindings (`COMPONENT_BINDING`, address as a second-argument accessor); `byAddress` is now a pure binding cache. |
| 28 | `COMPONENT_HANDOFF` brand + `forwards` map | — | **Done (Stage 2):** deleted. `dynamic` keeps its instance on component equality and delivers the address into per-site signals. |
| 29 | `ServerComponentPlugin` + flight codec refs | A1 | Derived — unchanged (component references serialize as addresses, never markup-as-data). |
| 30 | Single-flight application (`applyFlightResponse`) | A3 | Derived, simplified: regions address stores directly; no mount lookup, no per-frame `as`. |
| 31 | `slotsFor`/`claimRender`/reactive insert (Solid) | A2 | Derived; the claim-scope tracking hole (#2967's second bug) is fixed by construction: claims wrap the insert *call*, reads stay tracked. |
| 32 | Document boot: boundary index/claim/wait (`documentBoundary`) | A2/A6 | **Done (Stage 3):** "may a boundary still arrive" is the ledger's answer (`_$HY.fr.pending()`), reveal/exhaustion arrive by subscription; the `pl-*` document scans and `_$HY.fe` patch deleted. |
| 33 | Per-stream seroval tables (Solid `tables`) | A3 | Derived; keyed by address root (§5.2). |
| 34 | Boundary resume/scope capture (hydration.ts) | A2 | Derived — unchanged (multi-root hydrate is orthogonal). |
| 35 | Fragment reveal policy + claim registry (`_$HY.f`, `claimFragment`, `hasPendingFragment`) | — | **Done (Stage 3):** restructured into the fragment ledger (declared/settled/revealed/claimed/held, one Map) that also answers row 32 and detects truncation (§5.5); the ad-hoc claim/held Sets deleted into it. `hasPendingFragment` (claimRender's range-scoped template check) stays — the range is its own record. |

Score: 24 derived (several simplified), 8 compensatory deletions, 3 restructured.
The deletions are precisely the mechanisms with the worst bug-per-line record.

---

## 5. Settled questions

### 5.1 Store lifetime and eviction

A3 makes stores accumulate: preloads fill stores that may never mount. Policy:

- A store's lifetime couples to its **data-layer cache entry** where one exists: the
  transport exposes an eviction hook, and a `query`-wrapped call's cache eviction or
  invalidation evicts/marks the store. 1:1 addressing makes this coupling exact.
- For addresses never wrapped in a cache, the store follows the **response
  lifecycle + LRU floor**: bounded count, mounted-address stores are pinned,
  eviction of an unbound store is silent (a later bind refetches — the same behavior
  as a cold cache).
- Eviction of a *bound* address is not the eviction layer's call: teardown is
  disposal (the site unmounts), never a cache event morphing DOM (A3).

### 5.2 Versions, staleness, tables

- Versions are **per-address**, client-stamped at request time (the client is the
  only party that observes ordering across transports). Policy A is unchanged:
  stale writes drop, newer writes morph, teardown is disposal.
- A stream for address `A` racing a later refetch of `A`: the refetch's stamp is
  higher; the older stream's remaining chunks drop on arrival. No transition or
  navigation bookkeeping involved (solidjs/solid#2965's class is a version compare).
- In-flight streams for addresses no longer bound anywhere **write through** — they
  warm the store (arrival never touches DOM, so there is nothing to protect); actual
  request cancellation is the data layer's concern, not the transport's.
- Seroval cross-reference tables scope to the **response**, as today, but are
  indexed by address root rather than mounted-frame root (drops the mount lookup).

### 5.3 Regions under the split

A region is **store substructure**: identity `(parent address, occurrence, arg)`,
storage inside the parent address's store namespace. Consequences:

- The wire may still ship producer-relative child ids; they normalize to canonical
  region identity at the store boundary (one normalization, replacing scattered
  `renameRegion` calls at bind/resolve time).
- A parent rebind (site moves from address 1 to 2) leaves address 1's regions in
  address 1's store — retained with it, evicted with it. Region client state follows
  occurrence identity exactly as slot state does.
- Regions never register independently with the transport; nested `dx-frame`
  elements are mounts pulling substructure, so "route a region's async fragment to
  the region, not the root" (a shipped bug fix) becomes addressing, not routing.

### 5.4 Content vs presentation state

The store holds **content**: records, versions, completion/error. Everything
observable per-mount is **presentation**: segment-reveal progress, style waits,
fallback visibility, `frame:applied` reasons. The line matters for multi-mount
fan-out (two mounts of one address may be mid-reveal at different moments — reveal
state cannot live in the store) and it prevents the class of bug where a mount's
transient state leaks into retained content. Rule: nothing in the store references
DOM; nothing per-mount survives unmount.

### 5.5 Errors and truncation (L1)

- `:error` is content-level state in the store, per address+segment, cleared by a
  newer version's corresponding write (refetch-clears-error).
- `Errored` composes at the border exactly as `Loading` does: the mount surfaces the
  bound store's error state through the boundary seam; client boundaries decide UI.
- **Truncation is detected, not inferred:** a response ending without its terminal
  record marks every still-pending key of that version as truncated — an error-class
  store write (distinguishable from a server-sent error). **Document side done
  (Stage 3):** the parser finishing (DOMContentLoaded) is the transport's close;
  any `_fr` declaration still unsettled then is marked rejected with a truncation
  error, releasing its boundary through the normal rejection path and its
  document-adoption waiters through the ledger (closes solidjs/solid#2958 for
  documents). The sweep arms only when the runtime booted while the document was
  still streaming — a late-loaded runtime can't tell a completed page from a
  truncated one. Frame-stream truncation (pump ends without the root's `complete`
  chunk) lands with the `:error` content-state records above, not before them.

### 5.6 Head and assets

Head effects from server content ride the same shape as styles do today: **typed
asset records in the store, applied by the flush at reveal time**, deduplicated by
the head-management layer's identity rules (the in-flight head RFC owns element
identity; frames own delivery timing). Server components do not get a parallel head
mechanism. This seam is deliberately minimal until the head RFC lands; the only
commitment is that head effects are store records (A3) applied at reveal (A6).

### 5.7 Optimistic UI at the border

Single-copy has a consequence worth stating so users don't discover it as a bug:
**server content cannot be optimistically updated** — the client has no template to
re-render it (A1, A2). The blessed pattern: optimistic state lives in client slots
(which can overlay, badge, strike-through, or hide server content); server content
itself settles when the mutation's single-flight response morphs it. The transport
guarantees the two compose: a slot's optimistic state survives the settling morph
(A7), so the overlay never flickers. (Stage 7 refines, not repeals, this line:
transaction-scoped drafts may temporarily perturb server-rendered DOM as
*predictions*, replayed over every authoritative apply and evaporating at
settlement — the invariant that only server records make output durable stands.
See §9.2.)

### 5.8 Producer-side symmetry

The sink gets the same audit in Stage 2/3 implementation:

- **Record shape (A5) lands server-side first**: t = 0 document emission writes the
  same slot/region records a stream would (used regions included), into the one
  buffer. The occlusion-lock machinery simplifies to "content not rendered by the
  wrapper ships as records" — one rule, no lock negotiation.
- Document assembly emits frame `""` (DR-4): the existing `$df`-family scripts
  become arrival recorders; policy code in inline scripts deletes.
- Per-root boundary scopes and hole-owner ids are unaffected (they serve A1/A2).

---

## 6. Size budget

Derived from the mechanism set, not ratcheted from actuals. Current measured
(min+gzip, CI-guarded): **8,228 B** full frames consumer, **1,097 B** morph
slice. Stage 2 delivered −402 B against the 8,610 B it started from: A5's
consumer patches −98, the resident-store host −88, the identity split −216
(handoff/forwards/route-map deleted, net of the binding wrapper). Stage 4
(DR-5) cost +20 consumer / +30 slice: graft sites recorded at insertion are
a *derived* mechanism (rows 9–10) — the by-construction guarantee costs the
recording, against which the deleted rescan was slightly smaller but O(frame)
per apply and scan-based ("roughly size-neutral" below was optimistic by 30 B;
the slice stays under its ≤ 1,100 budget). The #2968 deferral (+105 inside
these figures) stays until record delivery is ordered by construction; the
remaining distance to the ≤ 7,800 B budget is row 20's `hy.r` occlusion drain
and that deferral — both gated on the document sink emitting frame-shaped
records (producer work deferred to the wire freeze).

Deletions and simplifications from §4 (handoff stack, retention snapshots,
`#refArgsUnchanged`, `hy.r` absorption, rename machinery, reveal-policy glue,
registry restructure) remove machinery; DR-1's binding delivery and DR-2's async
revive add small derived mechanisms. Budget:

| Scenario | Budget | Rationale |
|---|---|---|
| frames: full consumer | **≤ 7,800 B** | ≥ 700 B of compensatory machinery deletes; new derived mechanisms are ≤ 200 B combined. |
| frames: morph slice | **≤ 1,100 B** | Identity-first restructure is roughly size-neutral (index becomes primary, repair pass deletes). |
| non-consumer | **0 B** | Unchanged: apps that don't import frames pay nothing. |

**Ratchet rule (replaces "actual + headroom"):** a ceiling increase requires a new
mechanism row in §4 citing its axiom. A fix that needs bytes without a new mechanism
is compensatory by definition — fix the cause instead.

---

## 7. What this supersedes

- Contract §3 in `server-components.md` ("Boundary identity is the call") is
  superseded by DR-1: *content* identity is the call; *mount* identity is the site.
  §3's cache-honesty guarantee (per-args stores 1:1 with cache entries, retained
  re-materialization) is preserved verbatim.
- The `_$HY.f` reveal-policy routing (`0.50.0-next.35`) is an interim step that
  DR-4 replaces wholesale.
- `frame-streams-rfc.md` §"Versioning" gains the per-address, client-stamped
  clarification of §5.2; §"Slot usage tracking and the streaming-occlusion case"
  is superseded by §5.8's one-rule record shape.
- The open questions in Solid RFC 11 (`documentation/solid-2.0/11-server-components.md`)
  resolve as: reverse templating — constrained by DR-3; router retention — absorbed
  into A3/A4 (warm stores); template/block payload mode — unaffected, still a
  post-stabilization optimization; stabilization criteria — this document's
  implementation (Stages 2–4) plus wire freeze.

## 8. Staging

1. **Interim triage** (pre-derivation architecture): land the solidjs/solid#2967
   fixes and #2968 — user-facing breakage doesn't wait for redesigns. Annotated
   below:
   - #2967 fix 1 (`boundaryMayArrive`): does **not** survive — DR-4 deletes the
     heuristic it improves. Land it anyway; correctness now matters.
   - #2967 fix 2 (claim wraps the insert call): **survives** — it is the derived
     shape (audit row 31).
   - #2968 (records resolvable before adopt sync): the *symptom* fix is interim;
     A5 removes the timing skew that causes it.
2. **Stage 2 — DR-1 + A5** (identity split + record shape) in dom-expressions and
   `@solidjs/web/frames`. Wire changes acceptable; the feature is experimental.
   **Done:** A5 producer (t=0 records stream-identical, every region as a
   `$frame` ref) + consumer patch deletions; resident-store host (buffer/
   retention/sibling-seeding subsumed); identity split (per-function
   components, `COMPONENT_BINDING` bindings, per-site delivery in `dynamic`,
   `followBinding` → `rebind`; handoff/forwards/`documentComponent`/route-map
   deleted). Verified end-to-end on notes + hackernews (navigation, search
   state retention, single-flight save, rapid history, preload isolation).
3. **Stage 3 — DR-4** (one reveal owner). Touches `server.js` inline scripts and
   Solid hydration; the largest single surgery.
   **Done** (as refined in DR-4 above): the fragment ledger in Solid's hydration
   runtime (declared `_fr` records + seroval settlement + the inline `_$HY.v`
   reveal mark) published as `_$HY.fr`; frames document adoption reads/subscribes
   instead of scanning for `pl-*` templates and patching `_$HY.fe`; document
   truncation detection (#2958). Remaining under this decision record: frame-side
   truncation (with §5.5's `:error` records) and row 20's `hy.r` occlusion drain
   (deletes when the document sink emits frame-shaped records — producer work
   deferred until the wire freeze forces it).
4. **Stage 4 — DR-5** (identity-first morph).
   **Done:** the reconcile records each wholesale-inserted subtree root at
   insertion (through nested morph levels), and one post-reconcile walk
   (`flushGrafts`) swaps bare marker pairs in those subtrees for live ranges
   from the index — every place a range could be owed is on the list by
   construction, so no full-frame repair scan and no reachable "detached
   because the parent didn't match" state. `restoreDisplacedRanges` and its
   frame-wide `collectSlots` rescan deleted; range placement unified in
   `placeRange` (stashed fragment vs attached start).
5. **Re-verify** (notes, hackernews, hackernews-spa end-to-end), set §6 budgets as
   the CI ceilings, close the issue sweep.
   **Done, with one residual:** all three examples verified end-to-end post-DR-5
   (notes: search filter/clear with expansion state, single-flight save, viewer
   intact through list morphs; hackernews: rapid top-level nav without blank
   pages, comment threads through back/forward, pagination, hover-preload
   isolation; hackernews-spa baseline: list/item round trip). Issue sweep:
   #2958/#2964/#2965/#2967/#2968 closed; #2966 stays open by design (DR-2's
   async-args tiers are the plan of record for it). CI ceilings are ratcheted
   to actual+20 (8,248 / 1,117) rather than set to the §6 budgets — the
   ≤ 7,800 consumer budget is unreachable until the two producer-gated
   deletions land (row 20's `hy.r` occlusion drain and the #2968 deferral,
   both waiting on document-sink frame-shaped records at the wire freeze),
   so pinning it now would just fail CI without forcing the right work.

## 9. Roadmap after DR-2 (revised 2026-08-07)

§8's stages are the derivation-architecture build and are complete. This
section is the forward roadmap from the DR-2 merge onward; its stage
numbers are the working vocabulary and are distinct from §8's.

The reactive pole is **ratified** (2026-08-07; the lean and its reasoning
are recorded in `generator-only-model.md` §9). Live markup holes — the
binding ledger generalized from `(occurrence, arg)` slot bindings to
insert positions — are the plan of record; the generator-only model is
retired as a pole and survives only as potential authoring sugar.

1. **Stage 1 — Close out DR-2.** **Done.** The value tier on both faces
   (call-driven; document face via the `ssrAsyncValue` rxcore seam), the
   Case 1 binding ledger with commit-epoch sweeps and server memo
   liveness, `asyncArg` border typing, the arg-tier matrix rows, and the
   chat example. Merged to `next` and released.
2. **Stage 2 — Ratify the pole.** **Done** (decision, not build): the
   reactive pole, ratified 2026-08-07.
3. **Stage 3 — Live holes, call-driven face.** **Built (2026-08-08, the
   `live-holes` branches) — the ship line.** After this stage the model
   is announceable: the complete reactive story for everything after
   load, standard SSR semantics at load. What shipped, per the scope:
   - Ledger generalization: **done.** Thunk-compiled content holes in
     live frame renders wrap in identified comment pairs
     (`<!--lh:N-->…<!--lh:/N-->`) and open ledger bindings; commits
     re-run them, equality-gate the resolved HTML (marker-stripped
     baselines), and re-emit changes as keyed `hole` chunks the client
     morphs in place. Convergence is commit-driven and impurity-gated:
     an evaluation that emits records or creates reactive scopes latches
     (the record gate and the rxcore creation stamp), retry chains
     resolve mint-suppressed (`$lhSuppress` through `buildAsyncWrap`),
     and boundary/slot machinery is `$lhSkip`-tagged out.
   - Content holes + the chat slice: **done.** The chat demo streams
     markdown token-by-token through a `<Loading>`-wrapped iterable-fed
     `innerHTML` hole, no client component; `ctx.hold()` keeps the
     response window open for bounded async traces.
   - Attribute holes: **done.** Markers can't sit inside tags, so a tag
     with in-tag thunk holes is element-addressed: `ssr()`'s position
     scan (extended with per-segment tag geometry) splices
     ` data-lha="N"` at the tag open and captures the attribute area as
     re-runnable parts — including positions dequeued from
     cross-element `ssrGroup` batches, split per element. Rebuilds ship
     as element-keyed `attr` chunks with explicit `removed` name lists
     (the server holds the previous text; the client tracks no name
     history) and the client patches the addressed element in place.
     Mid-attr escalations latch the tag.
   - Lifetime and error semantics: **done, one scoped deviation.**
     Stream end latches (the end-latch sweep is the floor); supersession
     spans evaluation (`ssr()` resolves interior holes at construction,
     so nested mints land in the parent's retire list — a parent
     re-emission retires the child ranges it replaces); a mid-window
     throw is terminal — the hole latches at its last markup and the
     failure ships as a hole-keyed error chunk, surfaced client-side as
     a one-time diagnostic. The deviation: "escalates to the owning
     boundary" is deferred — true escalation means boundary-region
     re-emission (server) or a frame error-throw surface (client), and
     the latter does not exist for ANY error tier yet (stream-level
     `:error` only releases gates today). The hole-keyed error record is
     the hook that surface will consume when it lands.
   - The t=0 latch: **done and pinned** — document renders mark nothing
     and inject nothing; bytes are untouched (first-value lock).
     Correct-but-static is the accepted degraded mode at t=0; catch-up
     liveness is Stage 4's upgrade, not a Stage 3 repair.
   - Matrix rows and docs: **done** — engine cells in dom-expressions
     `frame-live-holes.spec.js`, integration cells in solid-web
     (`frame-live-holes*.spec.tsx`), rows in the lifecycle matrix's
     "Live markup holes" section.
4. **Stage 4 — Liveness at t=0.** **Built (2026-08-09, the
   `document-liveness` branches).** The t=0 design made real: hole
   markers and `data-lha` addresses armed in document renders inside
   server component scope (plain document content keeps its exact
   bytes — the scope barrier); ops ride ONE `sc:live` channel record,
   serialized eagerly; adoption reconstructs the morph substrate from
   page bytes; catch-up replays ops that landed before a boundary
   adopted (geometry-routed); document ops go quiet when a call-driven
   version supersedes them; the end latch ships last values and closes
   the channel before flush. Case-1 getter args are live at t=0 too:
   document arg bindings re-emit fid-tagged `slot` ops on the same
   channel. Fill interiors are mint-suppressed (client-owned; the
   record is their liveness story).
5. **Stage 5 — Container tier (DR-2 case 3).** **Built (2026-08-10, the
   `container-traces` branches).** Projections cross the slot border as
   bounded async traces on both faces; the client materializes them
   into live read-only projections. See the case-3 build record in DR-2
   for what shipped and the scope lines (whole containers this round;
   parts and case 4 remain the designed extensions).
6. **Stage 6 — Behavior across the border: ref props, event props,
   open claims.** **Next build target (re-scoped 2026-08-18; absorbs
   the 08-13 claims sketch and supersedes the 08-16 predictions
   design, whose surviving model moved to Stage 7).** Functions
   already cross the slot border as render props; Stage 6 completes
   the taxonomy: a slot-arg function in *ref position* on a server
   element delivers the element to the client closure — typed
   through the server component's props, claim-engine lifecycle
   (fire on adoption, re-fire on morph re-materialization), owner
   and cleanup from the passing scope — and *event position* is the
   same marker as sugar. SSR cost is gated at evaluation by the
   render context's frame flag. Attribute-keyed claims remain the
   class direction for content nobody can name (markdown holes) plus
   the affordance tier. More fundamental than optimism and lands
   first: no transaction machinery, the claim engine already exists,
   and event wiring / third-party mounts / observers justify it
   standalone. Retires `$ref`/`frame.refs` as author surface. See
   §9.1.
7. **Stage 7 — Optimistic drafts.** **Design revised 2026-08-18
   (supersedes overlays + entries, which superseded the 08-14
   transactional draft — the draft returns imperative, anchored by
   Stage 6 ref props).** One primitive: a transaction-scoped
   re-runnable draft — imperative DOM edits (plain JSX as node
   literals under per-run disposable roots) against fresh
   authoritative DOM, replayed after every intersecting
   authoritative apply, disposed at settlement. Reset is
   re-derivation (retained authoritative records + surviving
   drafts), never inverse patches. Display-only by contract;
   interactive optimistic UI is a client component. `frame.predict`,
   entry portals, and the frame handle itself retire as author
   surface; keyed adoption stays the deferred continuity
   escalation. Substrate shipped 2026-08-15: keyed element matching
   in the morph (`$key` → `_key`). See §9.2.
8. **Stage 8 — Connection-shaped transport.** Promoted from parked: the
   sink-lifetime separation means SSE/socket transports turn the same
   authored component non-terminating (generator-only-model.md §9,
   "transport-indifference"). Includes making the discipline
   enforceable, not just documented: the live graph is a re-derivable
   projection of durable state — reconnection is re-invocation, and dev
   should surface violations. Seed recorded 2026-08-17 (§9.3): no new
   APIs on either side — a connection is a response that doesn't end;
   resume is supersession with settled emission; the document face is
   bounded by an opt-in window; mutations settle against a watermark.
   The related data-API question (top-level async iterators from plain
   `"use server"` calls) is scoped separately and comes first.

Ordering note (revised 2026-08-18): Stage 6 is the next target and
now *precedes* optimism — it is dependency-shallow (a compiler round
plus the existing claim engine; no solid-core or transaction changes)
and carries standalone value (event wiring, third-party mounts, the
chat demo's copy button). Stage 7 consumes Stage 6's anchors and its
replay rides the same sweep. Stage 8 is independent afterward; it
must eventually add causal settlement (a mutation's transaction
remains open until the separate connection has applied its
authoritative frame version), but Stage 7 is first proved against
today's simpler single-flight ordering, where the response morph
lands before the action transaction settles.

**Parked here (2026-08-11), state of the world for whoever resumes:**
Stages 1–5 are built, merged to `next` in both repos, and released
(dom-expressions `0.50.0-next.41`; the paired solid release verified
against it — full suites plus browser passes over the chat and notes
examples). Nothing is in flight: no unmerged branches, no uncommitted
work; the `container-traces` worktree branches (`solid-dr2/`,
`dom-expressions-dr2/` siblings of the main checkouts) are fully folded
into `next` and exist only as workspaces. Development pairing
convention: solid's `pnpm-workspace.yaml` gains a
`'@dom-expressions/runtime': link:../dom-expressions-dr2/packages/runtime`
override marked DO NOT COMMIT; commits that touch the lockfile drop the
link, run `pnpm install --lockfile-only`, commit, then restore it.
Release-order invariant: dom-expressions publishes before solid bumps
its pins; solid's turbo cache can report a suite green without running
it — force-execute `packages/solid-web` and `packages/solid` tests when
verifying a release.

Still parked, deliberately: generator authoring sugar (the ledger's
supersession is already generator-ready); per-hole diff emission as a
wire optimization (contained by hole scope; adopted only where
measurement earns it). The chat demo's honest form sharpened the diff
case (2026-08-10): one hole over a growing reply re-ships the whole
rendered message per yield — O(n²) bytes over a generation for a few
words of new information each time. The first rung is NOT general
diffing (markup holes have no patch recorder; a wire diff would have to
be computed — the same line that parked the generator model's
server-side diffing): streamed text is append-mostly, and the hole
binding already retains its last emission for the equality gate, so a
prefix check yields an `append` op that ships just the tail, falling
back to full re-emission + morph whenever the prefix breaks (a code
fence closing retroactively). Additive to the chunk protocol; adopt
when measurement earns it.

### 9.1 Stage 6 design — behavior across the border: ref props, event props, and open claims (2026-08-18)

Collapsed out of two prior sections during the 2026-08-17/18 design
pass (Dev's ref-prop sketch; the SSR-cost resolution that followed):
the 2026-08-16 predictions design that previously lived here is
superseded — its surviving model moved to §9.2 (Stage 7) — and the
2026-08-13 generalized-claims sketch that lived in §9.2 folds in
below as this stage's class-based direction. Stage 6 also moved
*ahead* of optimism in the roadmap: it is dependency-shallow (one
compiler round plus the claim engine that already exists — no
transaction machinery, no solid-core changes) and carries standalone
value. Names remain provisional.

**The reframe that makes this one stage.** Functions already cross
the slot border: a function-valued slot arg *called* during server
render is a render prop — the call becomes a slot record, the client
executes the real closure, and the output fills the marked range.
The closure never ships; a coordinate does. Stage 6 completes that
taxonomy with the two remaining use sites, riding the same
occurrence/binding bookkeeping:

```text
use site         server emits                    client resolves to
────────         ────────────                    ──────────────────
called           slot record (id + args)         a range it renders into
ref position     claim marker on the element     the element, in hand
event position   claim marker on the element     a listener, attached
```

One exposure story covers all three: what ships is never behavior,
only an address where behavior resolves from the passing scope.

**Ref props — the instance direction, typed.** The server component
uses a function prop in ref position; the client passes a closure:

```tsx
// client
<CodeBlock copyBtn={el => {
  const onClick = () =>
    navigator.clipboard.writeText(el.closest("pre")?.textContent ?? "");
  el.addEventListener("click", onClick);
  onCleanup(() => el.removeEventListener("click", onClick));
}} />

// server
function CodeBlock(props) {
  return <pre>
    <button ref={props.copyBtn} aria-label="Copy">⧉</button>
    <code>{highlighted}</code>
  </pre>;
}
```

This **replaces `$ref` strings and `frame.refs` as author surface**
(the 2026-08-16 addressing decision is superseded; the index
machinery survives internally, below). Coordination moved from a
stringly name resolved through a frame handle into the props
contract: the component's signature *declares* the handle, TypeScript
checks both ends, and there is no handle to acquire — the
`ServerComponent<P>` generic widens from "every prop is a `Slot`" to
"every prop is a `Slot` or a behavior function." Under the hood
nothing is new: the server recognizes a cross-border function in ref
position and emits a marker attribute (`_hk` family) whose value
indexes the occurrence's existing binding table — occurrence-scoped
by construction, so two instances of one component never bleed, and
an element carrying several bindings packs one attribute. Lifecycle
is the claim engine's, which is exactly the contract behavior wants:
fires per element (several elements may take the same prop), on
adoption and on morph re-materialization (new element identity → the
old per-element scope disposes, the callback re-runs, listeners
re-attach), NOT re-fired when an attribute patch lands on a
surviving element. The owner is the client component that passed the
prop, so `onCleanup` works and context resolves.

What this buys beyond Stage 7's anchors — the reason the stage
stands alone: event wiring; third-party mounts (chart/editor/map
libraries that want a DOM node, which server markup could never host
before); observers and measurement (`IntersectionObserver`,
`ResizeObserver`, focus management, scroll anchoring); persistent
client islands (`insert(el, () => <Widget/>)` inside the callback —
the `Portal` replacement for client content living inside server
markup, with morph re-assertion re-mounting it). At the limit a
client component is **pure behavior**: no markup of its own, a bag
of functions handed to a server component — the server owns
structure, the client owns interaction. That is the resolved form of
the Datastar comparison: they attach behavior through attributes
interpreted by a global runtime; we attach it through typed props
that resolve to real closures with owner, context, and cleanup.

**Event props — the same marker, sugar.** `<button
onClick={props.onCopy}>` on a server intrinsic is mechanically
identical to a ref claim: marker out, native `addEventListener` on
adoption (not Solid delegated events — ordering and `currentTarget`
behave natively; an author who needs delegation semantics is writing
a client component). Decided 2026-08-18: supported — a server
component accepting `onX` props reads exactly like normal Solid —
with the caveat recorded that it makes the boundary invisible at the
use site (attach-on-adoption timing, re-attach on
re-materialization), where the ref spelling keeps the crossing
explicit. Refs ship as the primitive; event-position sugar follows
once the claim lifecycle has proven out — it compiles to the same
marker, so deferring costs nothing structurally.

**The SSR cost story (settled 2026-08-18): minimally detrimental by
construction.** Handler expressions in SSR output are today dropped
at compile time, *unevaluated*. The compiler round (Babel + Rust,
the `$key` shape) emits a guarded expression instead:

```js
sharedConfig.context.frame ? _$claim(props.onCopy) : ""
```

The frame flag on the shared render context — the established
channel for ambient render mode (the async property, hydration ids)
— gates *evaluation*, not just output: normal SSR pays one property
read per handler position and the expression never runs (no new
work, no new side effects, byte-identical markup). Carrying the sink
reference on the context rather than a boolean makes the flag test
and the binding-table handle the same read. Inside a frame render
the brand test sorts values: cross-border function → marker into the
occurrence's binding table; anything else → empty string plus a
dev-mode warning ("this handler can never run — pass it from the
client"). Zero client bytes for non-frames apps (the claim engine is
frames-bundle-only); markup weight only on elements that actually
claim. Pre-adoption clicks share hydration's dead window; if it ever
matters, root-level delegation for marker-bearing elements is the
known answer — deferred. In hydratable SSR the gate is closed by
scope (no frame context), so client-compiled hydration keeps sole
ownership of handlers — no double attachment.

**The class direction — open attribute claims (folded from the
2026-08-13 sketch; still this stage).** Ref props answer code that
can name its element in a component contract. They cannot answer
content *nobody can name ahead of time* — every code block streaming
through a markdown hole, where no per-element prop exists and a live
hole cannot mint components as it grows (the owner-creation latch,
by design). That is the claim registry's home turf, and the sketch
survives intact.

*The substrate exists.* The element-claim seam in the client runtime
(`registerElementClaim`, `claimElement`, `claimElementTree`,
`CLAIM_SEAM`): compiled DOM output claims elements at creation;
everything that materializes *serialized* server content — frame
streams, adopted SSR ranges, morph grafts — sweeps the subtree
through the same registry, re-firing when a morph touches an
element. Dormant by design (a null check when no consumer is
registered), idempotent, importless across bundled copies. Today it
has one consumer (the router's link layer) and a hard-coded selector
(`a[href], form[action]`). Ref-prop markers make Stage 6 itself the
second consumer; open registration is the third move:

1. *Open registration.* Consumer-declared claims keyed by an
   attribute namespace (not arbitrary selectors — the sweep stays
   one `querySelectorAll` over a fixed pattern). A server component
   writes `<button data-copy>`; a registered claim owns that
   attribute and attaches behavior when the element materializes,
   under the current reactive owner for cleanup. Attribute values
   are declarative arguments (`data-confirm="Delete this note?"`) —
   never code.
2. *The lifecycle contract, stated.* Claims fire at creation, at
   materialization of serialized content, and again when a morph
   replaces the element; handlers are idempotent (element-keyed
   dedupe per consumer). Identity-first morph does most state
   preservation for free — matched elements are the same DOM nodes —
   so only wholesale-replaced ranges re-claim fresh.
3. *A shipped affordance tier* — prebuilt claims (each ~10 lines,
   tree-shakeable entry) so the first affordance costs one attribute.

The primitive: register a behavior against an attribute, once, on
the client:

```tsx
import { registerClaim } from "@solidjs/web";
import { onCleanup } from "solid-js";

registerClaim("data-copy", el => {
  const onClick = () =>
    navigator.clipboard.writeText(el.closest("pre")?.textContent ?? "");
  el.addEventListener("click", onClick);
  onCleanup(() => el.removeEventListener("click", onClick));
});
```

Server markup opts in by writing the attribute — no slot declared,
no fill wired, no client component:

```tsx
// inside a "use server" component — or markdown post-processing
<pre>
  <button data-copy aria-label="Copy">⧉</button>
  <code>{highlighted}</code>
</pre>
```

Arguments are attribute values — declarative data, never code:

```tsx
registerClaim("data-confirm", el => {
  el.addEventListener("submit", e => {
    if (!confirm(el.getAttribute("data-confirm")!)) e.preventDefault();
  });
});

// server side: <form action={deleteNote} data-confirm="Delete this note?">
```

The shipped tier is nothing more than a set of these, each a
`registerClaim` call in a tree-shakeable entry:

```tsx
import { toggle, indicator, copy } from "@solidjs/web/affordances";

// then server markup anywhere:
<button data-toggle="#sidebar">☰</button>
<form action={save}><button data-indicator>Save</button></form>
```

And because sweeps run under the frame boundary's client owner, a
user-defined claim can resolve mount context — the capability form
(see the state contract below): the attribute names an operation,
the nearest provider supplies its meaning and authority:

```tsx
const Actions = createContext<Record<string, () => void>>();

registerClaim("data-action", el => {
  const actions = useContext(Actions);
  const click = () => actions?.[el.getAttribute("data-action")!]?.();
  el.addEventListener("click", click);
  onCleanup(() => el.removeEventListener("click", click));
});

// server: <button data-action="retry">Retry</button>
// client: <Actions.Provider value={{ retry: () => refetch() }}>…</Actions.Provider>
```

**The authoring split, revised (2026-08-18).** The 08-13 sketch
said "`ref` cannot cross the slot border (a closure does not
serialize)" — half superseded: the closure still never ships, but
its *coordinate* does, and that coordinate is exactly what ref props
are. The split is now typed-instance vs attributed-class: a **ref
prop** is behavior for elements the component contract can name —
per-instance, typed, resolved from the passing scope; a **claim
attribute** is the serializable name of behavior registered ahead of
time — per-kind, for markup where all you have is markup. Same
engine, two directions — a claim's argument is the element, a ref
prop's argument is the closure — complementary, not competing. (Solid
2.0 removed `use:` directives; ref props and attribute claims are
the complete pair.)

**Candidate tier** (filter: leans on semantics already in the
markup, needs zero expressions, or one of our examples already
hand-wrote it):

| Affordance | Goes on | Does |
|---|---|---|
| `data-toggle="#target"` | button | toggle class/`open` on target; menus, collapse |
| `data-copy` | button | clipboard-write nearest `<pre>`/target text |
| `data-confirm="msg"` | form, a | native `confirm()` gate before submit/navigate |
| `data-indicator` | form, button | busy class + disabled while action/navigation in flight |
| `data-autosubmit="300"` | input, select | debounced `requestSubmit()` of owning form |
| `data-bind="param"` | input | two-way sync with a URL query param (router-aware) |
| `data-scroll="bottom"` | container | follow appended/morphed content while reader at bottom |
| `data-focus` | element | focus on materialize; preserve focus/caret across morphs |

Four of these were already paid for by hand: the chat transcript's
`ResizeObserver` pinning (`data-scroll`), the notes save/delete flows
(`data-indicator`, `data-confirm`), the notes search field
(`data-bind` + `data-autosubmit` — currently a client component whose
whole job is "input writes a query param, debounced"). The
composition is the pitch: `data-bind` plus a server component keyed
by that param is live search with zero client components. Note the
overlap with ref props is real but shallow: where a component
contract exists, the copy button is better as a ref prop (typed, no
attribute vocabulary); `data-copy` earns its place inside markdown
holes and post-processed content.

**Positioning.** The tier is htmx's affordance lineage
(request-lifecycle dressing: confirm/indicator/trigger), not
Datastar's (a client reactive system in attributes —
`data-signals`/`data-show`/`data-on` with expressions). We refuse the
Datastar layer not because it is bad but because Solid already has a
strictly better version: signals and JSX, typed, compiled, DCE'd.
What we take from Datastar is architectural — morph-surviving
attachment as a first-class contract, which htmx historically bolts
on. One line: htmx's affordance tier, on Datastar's morph-survival
discipline, under Solid's rule that expressions live in JSX. The
escape hatch up from the tier is a ref prop, then a component —
never an attribute expression.

**The state contract (2026-08-14, unchanged).** Spec/native
built-ins should remain transport- or DOM-local: submit, navigate,
confirm, busy, open/closed, focus, scroll, a URL param. The
*primitive* is not so limited. Claim sweeps already run under the
client owner associated with the frame boundary, so a user-defined
claim may resolve the nearest client context and invoke a named
capability or reactively reflect its state. The markup still carries
data, never expressions or serialized closures; the provider is the
local authority boundary. Client components wrapping the insertion
point and claimed server-authored elements can therefore be two
front doors into the same mutation interface. Stage 7's draft
machinery is the natural writable capability such a context may
expose, but claims do not require it.

**Tier policy option (2026-08-13): spec'd-only built-ins.** Possibly
the only *shipped* affordances are ones the platform has spec'd or
formally proposed — `command`/`commandfor` enhancement, `popover`,
`<details name>`, Triptych's forms — and Solid never mints attribute
vocabulary at all: everything invented in the table above ships as
documented `registerClaim` recipes, not package API. Buys: dissolves
naming entirely; shrinks freeze exposure to ~zero (the shipped set is
defined by an external process; deprecation is the browser shipping);
makes the primitive the product. Costs: the two flagship compositions
(`data-bind` live search, `data-scroll` stream-following) have no
platform equivalent on any horizon and drop from one attribute to
copy-a-recipe; and "spec'd" needs a line drawn — strict reading ships
almost nothing today, loose reading tracks moving drafts. Spectrum to
decide at build time, not before stable (the substrate is identical
across all three): (a) spec'd-only + recipes, (b) spec'd built-ins +
a blessed-recipes package that is explicitly non-contract, (c) the
invented tier. Packaging posture only. Ref props soften every cost
here: the flagship compositions can also ship as typed helper
components/props with no attribute vocabulary at all.

**Native alignment rule.** The htmx-adjacent platform proposals
(Triptych's button `action`/`method`, invoker `command`/`commandfor`
— shipping, `popover` — shipped, `<details name>` — shipped) are
attribute-shaped, expression-free, form/anchor-semantic: the same
dialect. Each affordance is therefore written as a forward-polyfill —
where a native attribute exists or is proposed, adopt its vocabulary
(prefer enhancing `commandfor` over inventing toggle syntax) so markup
written today degrades toward the platform, not away from it. The
claims substrate makes the exit graceful: "the browser does this now"
is deleting one registration. The exchange itself (partial
replacement, Triptych's biggest ask) is *not* affordance-tier — frame
streams and morphs already own it and do more.

**RC-freeze compatibility (2026-08-13, unchanged).** The claim trio
is frozen public API — `@solidjs/web`'s client entry wholesale
re-exports the runtime client, so `registerElementClaim`/
`claimElement`/`claimElementTree` and their semantics (handlers
observe the navigation-relevant set: `a[href]`, `form[action]`) are
in the RC contract, with the router's `setupLinkClaims` as a live
consumer. The generalization is additive *only if* one line holds:
attribute-keyed claims (and the internal ref-marker claim) route
through their own per-attribute handler lists — the existing
`registerElementClaim` broadcast channel must NOT widen to observe
attribute-claimed elements, or every frozen-API consumer starts
receiving element kinds the contract never promised. Likewise the
`CLAIM_SEAM` registered symbol (a flat handler array shared across
separately bundled — potentially differently versioned — runtime
copies) keeps its shape; attribute-keyed registration hangs off a
second registered symbol.

**Decide before stable (2026-08-13; the seam is movable during RC,
frozen after).** Two decisions harden at stable; everything else in
this section is provably additive later:

1. *The navigation element set.* `a[href], form[action]` is baked into
   the frozen channel's semantics — consumer filters are written
   against it — and it is currently incomplete as a navigation
   contract: `area[href]` navigates, `button[formaction]` re-targets a
   form. Widening after stable changes what every registered handler
   receives (the self-inflicted version of the "channel never widens"
   hazard). Settle the set during RC, or document it as closed and
   final.
2. *The seam global's shape.* `CLAIM_SEAM` holds a bare array shared
   across separately bundled — potentially differently versioned —
   runtime copies, so stable's shape is the wire format forever.
   Either reshape to an extensible object now, or commit to attribute
   claims living on a second registered symbol (zero RC churn — the
   recorded lean).

**What died here (2026-08-18):** `$ref` and `frame.refs` as author
surface (the marker/index machinery survives as the internal claim
that resolves ref-prop coordinates); ref-only `Frame` acquisition
for behavior purposes; `Portal` as the sanctioned mechanism for
client content inside server markup (a ref-prop callback with
`insert` covers it, owner-correct); `$seam` was already dead. `$key`
is untouched — morph-only identity, no client-facing role.

**Open questions.** Marker encoding final form (one packed attribute
vs per-binding); the ref callback's cleanup contract (returned
cleanup vs ambient `onCleanup` — lean: both, matching client refs);
whether event sugar ships in the same compiler round or the next;
exact attribute namespace and sweep cost for open claims; packaging
(which entry ships the affordance tier so it stays tree-shakeable);
the re-claim dedupe contract (element-keyed WeakSet per consumer is
the obvious shape); how `data-bind` discovers the router without a
hard dependency.

### 9.2 Stage 7 design — optimistic drafts (revised 2026-08-18; supersedes overlays + optimistic entries)

Third form of this design, and the supersession chain is the story:
the 2026-08-14 seed was a walkable transactional draft
(`frame.update(draft => ...)`); 2026-08-15/16 killed it for overlays
(`frame.predict`) plus entry portals, on the argument that a
draft-authored node must mirror server markup to be a coherent
prediction; 2026-08-18 the draft returns — imperative, reshaped so
the mirror argument no longer applies — and the overlay/portal
surface retires. The trigger was authoring weight (portal +
optimistic store + a row component authored isomorphically or twice,
versus a colocated snippet; client JSX works as a plain node literal
inside an imperative body) plus a mechanical realization: a draft
that *re-runs against fresh authoritative DOM after every apply* is
an overlay with an imperative body — the same GGPO discipline, none
of the recipe/replay machinery that killed the 08-14 form. What the
08-16 pass got right survives below unchanged: the derived frame,
the transaction wave, morph-as-correction, address scoping, and the
`_key` substrate. What it got wrong was concluding that structural
prediction needs a *declarative* surface to stay honest —
re-running from authoritative truth is what keeps it honest; the
vocabulary can be imperative. And its own core judgment stands: a
draft must never *pretend to be* the authoritative row. The 08-18
form makes that structural — drafts are display-only placeholders
(below), so the "silently rots as server markup evolves" failure
mode has nothing to rot against.

**The correspondence (unchanged).** A frame is always a derived,
readonly projection:

```text
derived optimistic store          frame
────────────────────────          ─────
authoritative derived source      resident frame records
transaction-local prediction      draft
source recompute                  authoritative frame write
store reconciliation              authoritative restore + draft replay
```

There is no locally writable authoritative base: a draft's output
becomes durable only when server output independently contains it.
On settlement the frame always reconciles from its current records —
success keeps the outcome because those records advanced; failure
removes it because they did not.

**Optimism is the write's type (unchanged).** Under single-writer
discipline the server owns frame markup, so a client statement about
that markup is definitionally a *prediction*. Transaction scoping is
what keeps the frame derived under that discipline: drafts are held
intent composed over the record, so any authoritative apply —
including one triggered by a *different* concurrent transaction —
re-derives `record + still-active drafts` instead of client writes
stomping server truth or being stomped by it. There is no
inverse-patch log; the authoritative record *is* the rollback state.
Datastar asks authors to manually undo client state on failure; here
rollback and re-application are the same operation — recompute the
derivation with one input removed. Concurrent transactions clear
independently: when A settles while B is still active, the frame
restores the latest authoritative records, drops A's drafts, and
replays B's — per-lane intent, not inverse DOM patches.

**The primitive.** One verb, transaction-registered:

```tsx
// client
const send = action(async function* (text: string) {
  update(() => {
    list()?.append(
      <li class="pending"><p>{text}</p><small>Sending…</small></li>
    );
  });
  yield* sendComment(text);
});

<Comments list={setList} />   // a Stage 6 ref prop doubles as the anchor

// server
function Comments(props) {
  return <ul ref={props.list}>{/* authoritative rows */}</ul>;
}
```

Semantics:

- **Same transaction wave.** A draft registers in the current batch
  like an optimistic store write — visible immediately, adopted into
  the action transition when that batch becomes one, disposed at
  settlement. Frames stay the third optimistic participant beside
  signals and stores; this is not an action-only mode.
- **Re-runnable — the GGPO loop.** After every authoritative apply
  that intersects a draft (morph, hole update, attribute record),
  the engine restores the affected regions from retained
  authoritative records and replays surviving drafts in transaction
  start order. Every run starts from fresh authoritative DOM, which
  makes appends naturally idempotent and stale-handle bugs
  structurally unreachable. Restoration is re-derivation, not
  inverse rollback: server snapshots are ground truth, drafts are
  replayed predictions.
- **Anchored by ref props, captured in closure.** No `querySelector`
  coupling to server markup shape, and no frame handle: the anchor
  elements a draft touches define its re-run scope, so `update()`
  needs no frame argument. It belongs to the action/optimistic
  machinery in solid, not to a handle in dom-expressions.
- **JSX is a node literal.** Each run executes under a per-run
  disposable root: static JSX is `cloneNode`, expression holes get
  effects that dispose before the next run. Drafts are NOT
  signal-reactive — they re-run on authoritative applies, not on
  client signal changes; per-run evaluation reads current values and
  that is the entire reactivity story, by design. (This resolves the
  "what does client JSX compile to without an owner" objection that
  killed JSX-in-draft on first look.)
- **Display-only, as a hard documented line.** Re-runs recreate
  nodes, so interactive content inside a draft (an input holding
  focus and half-typed text) loses state on any intersecting apply.
  Anything interactive during a pending transaction is a real client
  component — mounted through a Stage 6 ref callback if it must live
  inside server markup. Keyed adoption (a temp-key protocol
  transferring a live draft node into authoritative ownership for
  perfect DOM continuity) remains the designed escalation,
  deliberately deferred — nothing in the acceptance gate requires
  it.

**The settle race, answered by single-flight.** Does the "Sending…"
row coexist with the confirmed row? Under single-flight, no: the
confirming morph and the transaction settling are the same event, so
the draft disposes in the tick its prediction comes true. The race
exists only when an out-of-band refresh lands mid-transaction with
the row already committed — then the author dedupes (the draft runs
against real authoritative DOM and can check it; this is the
jQuery-era honesty being signed up for) or accepts a transient
duplicate. Entity-keyed overlays solved this by construction; the
imperative form trades it for authoring freedom, and the trade is
acceptable *because it is stated*. Stage 8's separate connection
needs the causal watermark (§9.3) before this guarantee transfers.

**In-flight streaming (unchanged rule).** Authoritative updates do
not wait for optimism: every incoming chunk first advances the
authoritative records, the morph applies them, and drafts replay on
the result. `latest records + still-active drafts = visible DOM`.
No whole-frame draft materialization exists at any point; the
streaming path keeps today's direct apply.

**Address-scoped (unchanged decision, restated for drafts).** A
draft belongs to the content addresses of the elements it anchors,
captured at registration — the DR-1 answer. Rebinding a mount to a
new address never carries the old call's draft (markup predicted for
one render must not graft onto a different render); rebinding back
while the transaction is still active restores it; two mounts of one
address replay the same draft. The tier's honest boundary line
stands: **predictions do not span addresses.** An optimistic row
under `getTodos("all")`'s list does not appear in
`getTodos("active")`, though the server would reflect it in both —
the frame layer holds markup, not data. When optimism must span
multiple server renders, it is data-shaped and belongs in a client
store/projection. Site-local state — focus, selection, an open menu
— was never prediction state; it stays with components and Stage 6
behavior.

**Shipped substrate (2026-08-15, `keyed-morph`) — unchanged.** Keyed
element matching landed in the morph: `compatible()` requires equal
`_key`, so the relocation lookahead moves a keyed node into position
instead of rewriting positions, and live element state — typed
`value`, `checked`, `open`, focus — follows the *entity* across
reordering morphs. Sibling-scoped, matching client `For` semantics.
This shipped independently (it corrected a live defect) and is what
makes draft anchors coherent across reorders: the ref-prop element a
draft captured rides the node `_key` matching preserves.

**Package boundary.** dom-expressions owns restore-and-replay: the
apply pipeline exposes "an authoritative apply landed here" plus the
retained records to restore from, and the ref-marker claim supplies
anchors (Stage 6). solid-web binds draft registration to Solid's
transaction machinery and owns the per-run roots. Today's
single-flight response applies authoritative records before
transaction settlement, which the race answer above relies on.

**Open questions.**

- Does a declarative element-in-hand patch form (`predict(el,
  {checked: true})`) survive as sugar over drafts? The 08-16
  "claims predict too" resolution reduces to a one-line draft now
  (`update(() => { el.checked = true })` replays identically). Lean:
  not in v1; add it if the TodoMVC port shows patch-shaped drafts
  dominating and the sugar earns its bytes.
- `update()`'s name and home — it parallels optimistic-store writes
  more than anything frame-shaped; naming should say
  transaction-scoped, not frame-scoped.
- The intersect definition: which applies trigger which drafts —
  anchor-containing regions only, or any apply to the anchor's
  address. Start coarse (address), tighten if replay cost shows up.
- Whether draft replay rides the claim sweep (one engine, Stage 6's
  third internal consumer) or hooks the apply pipeline directly.

**Acceptance gate — Server Component TodoMVC (restated for
drafts).** Port the existing `examples/todos` beside itself,
preserving its delays, ~33% write failure, per-item retry, bulk
actions, filters, and overlapping transitions. The existing app is
the derived `createOptimisticStore` reference implementation; the
port replaces its authoritative data/render with server-component
markup plus drafts. Pass condition: **every optimistic behavior
lands in drafts anchored by ref props, or in data-shaped client
state — zero selector coupling to server markup, zero vocabulary
beyond JSX and imperative DOM against elements in hand.**
Toggle/pending/disabled/error markup and the optimistic add row are
drafts; counters and filter state are data-shaped (slot args /
client signals). Do not publish the API until add/remove/toggle
success and failure, checkbox correction, concurrent and bulk
mutations, retry/error markup, state retention across reordering
morphs (the `_key` substrate: focus, typed values), and clean
hydration all work. The decision criterion beyond correctness is
simplicity parity: if the port relocates the current store's
simplicity into draft bookkeeping, the abstraction fails.

**Non-negotiable invariant (unchanged):** the frame itself remains
derived. Drafts may temporarily perturb its rendered projection, but
only an authoritative frame record can make that output durable.

### 9.3 Stage 8 seed — connection-shaped transport (2026-08-17)

Recorded from the design conversation; nothing here is built. The
stage shrank three times during the pass, each time by discovering
the capability already existed — what remains is a continuation story
and a contract with failure, not a transport feature.

**Scope split (decided the same night).** Server-component liveness
(this section) is distinct from the data-API question: what a
top-level async iterator returned from a plain `"use server"` call
means as a Solid data primitive (consumption semantics, SSR, sharing,
reconnection). The data layer is prioritized FIRST and investigated
separately; the frames value tier should ride whatever it decides.
This seed covers the frame/markup face only.

**No new APIs — a connection is a response that doesn't end.**
`"use server"` is untouched on both sides. The component not
terminating is the entire liveness declaration, and it is observed,
not configured: the stream face already waits on reactivity, because
every live server source is await-shaped — a projection over a feed
sits on a pending `next()` between events, a generator holds an
outstanding yield, the retry loop holds an unsettled promise. There
is no "subscribed but nothing pending" state (raw post-flush writes
are already forbidden), so "waits on pending" and "waits on
reactivity" are the same wait, and a component over an infinite feed
would hold its response and keep emitting today. Stage 8 is the
warranty on that accident, plus the pieces below.

Configuration therefore lives at the edges, where config already
lives: the server entry owns the operational envelope (carrier
framing, hold caps, idle timeouts — per-route), the client host owns
reconnect policy (backoff, a knob beside retention). Because
reconnection is re-invocation, every cap is a QoS dial, not a
correctness switch: a 30-second platform limit produces a 30-second
resume cycle — chattier, still correct — degrading in the
pathological limit to long-polling, emergent and never implemented.

**Carrier is content negotiation.** The invocation is a POST whose
response body is the record stream; "use SSE" is a response
*framing*, not a channel. The entry opts in (`carrier: "sse"`),
Content-Type carries the decision, the client picks its decoder off
the header. SSE framing, NOT the EventSource API (which cannot POST,
and whose auto-reconnect we do not want — the host owns resume): what
SSE buys is the middleboxes — proxies and platform load balancers
that buffer opaque chunked responses pass `text/event-stream`
unbuffered — plus comment-line heartbeats against idle timeouts, and
an `id:` field that is a natural home for the watermark. Live
responses ship `Cache-Control: no-store` (a cached clone of an
unbounded stream outlives its page). WebSocket stays deferred until
proven necessary — upgrade handshake, bidirectional, the client must
know a URL: the one carrier that would cost API.

**Taxonomy: promises for eventual, iterators for persistent.** Every
persistent thing the system already built is iterator-shaped —
container traces (snapshot + patch iterable), generator components,
live-hole re-emissions, the record stream itself. The only
promise-factory is the retry loop, correctly, because it names an
EVENTUAL value. Persistence and eventuality are the two async kinds;
promise factories masquerading as persistence should not exist.

**Resume is supersession, not continuation.** Iterators are not
seekable; re-invocation replays from the start. So a resume is a
SUPERSEDING RENDER of the address, never a continuation of the old
iterator: fresh snapshot from durable state, morph converges,
identical regions no-op, retained element state follows `_key`.
Value-tier iterables get fresh-instance supersession — the resumed
render's args replace the old ones, a client `For` re-renders from
the new iterable, nothing appends twice. Cursors (true positional
resume for sources with real sequence numbers) are an opt-in
optimization, never the baseline, because the baseline must hold for
sources that have none. The re-derivability line, sharpened: **if
losing the transport loses the value, the value belonged in durable
state, not in the iterator.** An in-flight LLM generation is eventual
wearing iterator clothes — its durable form (the message row) is what
a resume renders; the lost tail is app semantics, not framework
failure. Dev-mode chaos reconnect is the enforcement.

**Settled emission — progressiveness is consumer-relative.** The
client's async-holds-latest rule, applied at the emitter: do not
stream the settling journey to a consumer already holding content.
The progression — fallbacks, partial reveals, loading states — is UX
for an empty screen, not data; a resuming consumer has no empty
screen. Same render, two emission policies, selected by the request
itself (a resume request carries "I hold version N"; that bit IS the
selector): fresh consumer → progressive, today's streaming; resuming
consumer → render quietly to the existing settlement latch, emit one
converged snapshot, keep the sink open. Regression never hits the
wire — which retired the client-side version-floor guard an earlier
draft of this seed needed.

**Quiet resume contract.** A resume is lifecycle-silent: the host
resume loop runs OUTSIDE transitions (no `isPending` pulses on a
platform's 30-second cycle), retained content keeps boundaries
revealed (first-content gating and async-holds-latest already
guarantee no fallback flash), and a resume's own settlement settles
nothing transaction-shaped — predictions hold to their watermark,
never to the resume.

**Watermark = cursor.** A mutation ack carries "reflected as of
version N"; the transaction and its overlays hold until the
address's version passes N — whether that version arrives on the
original response, a live stream, or a resume snapshot. The same
"I hold version N" is the resume request's emission-policy selector.
Requires per-address versions monotonic across responses; the
address-resident store is the authority.

**Document face: bounded by a window, not by detection.** Persistence
cannot be detected — a feed's pending `next()` is byte-identical to a
finite generator's, and "will this settle?" is the halting problem —
so it is DEMONSTRATED instead: the document window (an entry-level
knob) closes the document response, and whatever outlives it is
persistent by demonstration. Eventual = settles within the window;
persistent = outlives it — an operational taxonomy, the same rule as
any transport cap. **Default = no window = today's
wait-for-full-settlement**: bounded generators stream their whole
progression into the document (full content, SEO) exactly as now;
nothing breaks. Setting the window is the opt-in to live-at-t=0, and
is REQUIRED there — an unbounded source with no window holds the
document open forever (tab spinner, `load` never fires, buffering
proxies, unflushed serializer state). At the window: clean close at a
record boundary, final sweep, a live-marker bit on frames whose
bindings remained open; adoption sees the bit and starts the resume
loop. The document is just the transport that ends first and most
predictably; the gap between close and resume is covered by the
settled snapshot (self-healing — no missed-event protocol). Honest
cost: one extra server render per live frame per page load — the
seam where per-address fan-out slots in later if it ever matters.

**Work items (the whole stage, current best understanding):**

1. Emission-policy selector on the frame render (progressive vs
   settled), driven by the request's "I hold version N".
2. Host resume loop: re-invoke on response death, backoff, outside
   transitions.
3. Fresh-iterable supersession proven on the resume path (existing
   rule; needs the test).
4. Watermark on mutation acks + monotonic per-address versions.
5. Server teardown on client disconnect: response abort cancels the
   generator and disposes the render — without this, every abandoned
   tab leaks a server loop.
6. Document window + live-marker bit + adoption-triggered resume.
7. Open surface question: expose connection state on the frame handle
   (a `connected` signal for "reconnecting…" UI) — small, additive,
   undecided.

Deliberately absent: any client authoring API, any server authoring
API, any subscription registry, any cursor protocol, WebSocket.
