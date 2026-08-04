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

Slot args are **data, not holes** — the server never renders them, so it never
suspends its stream on them. Classification is by the value's nature, decided
*before* resolution (see DR-3):

1. **Plain promises / async iterables** are self-contained values. The server
   serializes a pending record and streams on; resolutions/yields ride later data
   chunks (seroval's streaming serialization is already this shape). On the client
   the record revives as an **async source**, and prop reads through the live-props
   proxy follow the normal async read path — the *client component's* read suspends
   into its own nearest `Loading` at the consumption point. No server fallback, no
   fragment, no reveal machinery. This is exactly how a promise prop behaves between
   two client components; the border stops being special.
2. **Reactive primitives** (async memos, projections, stores) are anchored to the
   server's reactive graph and have exactly two coherent crossings:
   - **Pass-through (preferred if viable):** a live channel preserving identity and
     updates — one snapshot plus patch batches for projections, successive values
     for async memos. Viability hinges on three questions the implementation must
     answer before adopting it: revive identity (the same source passed to two slots
     is one client object), server lifetime (a still-yielding response is a
     subscription channel; bounded at response completion unless a deliberate
     decision extends it), and disposal (replacing the frame disposes the server
     source — requires a teardown signal for in-flight responses).
   - **Hole treatment (the recourse):** the server resolves the read in its own
     reactive context, exactly like a content hole — a pending record defers and
     streams when the source settles, with the same non-blocking discipline as
     deferred fragments (the stream continues; response *completion* waits, per L1).
     The client receives a settled plain value and no updates.
   There is no third option: "defer to client" is incoherent for a reactive value —
   without the channel, a raw handle means nothing off-graph. If pass-through is
   rejected, holes are not a design preference but the only recourse.
3. **The serializer never crashes.** An unserializable reactive value is a
   diagnosable error naming the slot and the type, not `Seroval Error (step: 1)`
   (solidjs/solid#2966's presenting symptom).

Server-content async (`<Loading>` inside server JSX) is a different async and keeps
the fragment model wholesale. The two never mix: one is markup the server owns, the
other is data the client owns.

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
| 2 | Multi-mount routing + pending buffer (frame host) | A3/A4 | Derived, simplified: fan-out becomes multiple mounts pulling one store; buffering remains for unregistered ids. |
| 3 | Retention snapshots (`snapshot`, last-unregister-wins) | — | Compensatory (DR-1). Deletes: a warm store *is* retention. Lifetime policy in §5.1. |
| 4 | HTTP pump (`applyFrameResponse`: `as`/`route`/restamp) | A3 | Derived, simplified: responses address stores, not mounted frames; the `as` remap of a *mount* disappears. |
| 5 | Version gating, policy A (stale-guard, not reset) | A3/A4 | Derived — unchanged, now explicitly per-address with client-stamped authority (§5.2). |
| 6 | Slot-record identity dedupe (`argsEquivalent`) | A5 | Derived, simplified: with one record shape the conservative `$ref` special-casing shrinks. |
| 7 | Prerequisite flush loop (`#flush`) | A6 | Derived — becomes THE reveal engine for document + frames (DR-4). |
| 8 | `frame:applied` event | — | Derived (router affordance) — unchanged. |
| 9 | Zero-allocation morph (`reconcileChildren`) | A7 | Derived, restructured: identity-first (DR-5). |
| 10 | Displaced-range index + stash/restore | A7 | Absorbed: becomes the primary matching path, not a repair pass (DR-5). |
| 11 | Root materialize vs morph split | A4 | Derived — unchanged. |
| 12 | Slot marker collection/parsing | A1 | Derived — unchanged. |
| 13 | Occurrence mount/re-call/unmount (`#syncSlots`) | A4 | Derived — unchanged in role; simpler inputs (A5). |
| 14 | Invoke context (`ctx`: adopted/invoked/existing/…) | A5 | Derived, shrinks: the `adopted` fork exists because t = 0 records differ (A5 removes the difference). |
| 15 | Live slot props (`ctx.onUpdate`, signal-backed proxy) | A4 | Derived — and generalized upward: the same "new binding, same instance" shape serves boundary rebinds (DR-1) and async arg updates (DR-2). |
| 16 | `#refArgsUnchanged` value-compare | A5 | Compensatory (#547 cluster). Deletes with unified records. |
| 17 | `$ref`/`$frame` arg resolution + per-stream tables | A1/A3 | Derived; table scoping revisited under per-address stores (§5.2). |
| 18 | Region discovery from markup (`#discoverRegions`) | A5 | Compensatory as a *separate identity path*: with A5, used regions have records on every transport; discovery remains only as claim wiring, not identity recovery. |
| 19 | Region bind/rebind/`renameRegion` (wire-id renames) | A3 | Compensatory: regions become store substructure keyed `(parent address, occurrence, arg)` (§5.3); wire-relative renames delete. |
| 20 | `hy.r` occlusion absorption (adopt-time fake chunks) | A5/A6 | Compensatory. Deletes: occluded content is ordinary records in the one buffer, drained by the one consumer (DR-4). |
| 21 | Segment reveal + placeholder discovery (`#revealSegment`) | A6 | Derived — and becomes the only implementation (DR-4). |
| 22 | Stylesheet gating + modulepreload | A6/L1 | Derived — unchanged, one instance instead of two. |
| 23 | Boundary-driven reveal seam (`options.reveal`) | A6 | Derived — unchanged. |
| 24 | Element claim sweeps (`CLAIM_SEAM`) | A2 | Derived — unchanged. |
| 25 | `<dx-frame>` element boundary | A4 | Derived — unchanged. |
| 26 | Dispose/rebind lifecycle (`FrameImpl.rebind`) | — | Rebind-by-wire-id deletes (DR-1); dispose stays (teardown is disposal). |
| 27 | Address-keyed component registry (`byAddress` minting) | A3/A4 | Restructured: per-function components + per-site binding delivery replace per-args component minting (DR-1). |
| 28 | `COMPONENT_HANDOFF` brand + `forwards` map | — | Compensatory (DR-1). Deletes. |
| 29 | `ServerComponentPlugin` + flight codec refs | A1 | Derived — unchanged (component references serialize as addresses, never markup-as-data). |
| 30 | Single-flight application (`applyFlightResponse`) | A3 | Derived, simplified: regions address stores directly; no mount lookup, no per-frame `as`. |
| 31 | `slotsFor`/`claimRender`/reactive insert (Solid) | A2 | Derived; the claim-scope tracking hole (#2967's second bug) is fixed by construction: claims wrap the insert *call*, reads stay tracked. |
| 32 | Document boot: boundary index/claim/wait (`documentBoundary`) | A2/A6 | Derived, simplified: "may a boundary still arrive" becomes a store question (is a pending segment recorded for it), not a `_$HY.done`/`documentStreaming` heuristic. |
| 33 | Per-stream seroval tables (Solid `tables`) | A3 | Derived; keyed by address root (§5.2). |
| 34 | Boundary resume/scope capture (hydration.ts) | A2 | Derived — unchanged (multi-root hydrate is orthogonal). |
| 35 | Fragment reveal policy + claim registry (`_$HY.f`, `claimFragment`, `hasPendingFragment`) | — | Compensatory glue between the two reveal owners. Deletes with DR-4. |

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
  store write (distinguishable from a server-sent error). The `_$HY.fe` seam this
  requires gets implemented as part of DR-4's single consumer (closing the
  solidjs/solid#2958 hole for both document and frame streams at once).

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
(A7), so the overlay never flickers.

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
(min+gzip, CI-guarded): **8,610 B** full frames consumer (8,505 + 105 for the
stage-1 interim #2968 deferral, which stage 2 deletes), **1,067 B** morph slice.

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
3. **Stage 3 — DR-4** (one reveal owner). Touches `server.js` inline scripts and
   Solid hydration; the largest single surgery.
4. **Stage 4 — DR-5** (identity-first morph).
5. **Re-verify** (notes, hackernews, hackernews-spa end-to-end), set §6 budgets as
   the CI ceilings, close the issue sweep.
