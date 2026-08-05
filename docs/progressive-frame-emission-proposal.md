# Progressive Frame Emission (PROPOSAL — not ratified)

Status: **draft for review**. Nothing here is implemented; this document
exists so the API and its repercussions can be evaluated as a plan of its
own. Companion to `server-components-principles.md`.

## One sentence

A `"use server"` **async generator that yields components** is a server
component whose markup settles over time: each yield renders and emits a
new root `html` chunk on the same frame id and version, the client morphs
it in place, and the stream completes when the generator returns.

## Motivation

The client's store model already treats successive root html writes as
in-place morphs (policy A), and DR-5's identity-first morph resolves
"same prefix + more" into a text patch on the last node plus tail appends
— settled DOM, selection, scroll, and slot state survive. Today only
*separate responses* (refetch, mutation regions) can exercise this. The
producer renders exactly once per response (`frameStream` wraps a single
`renderToStream` pass), so there is no way for one response to carry
markup that *grows*.

The motivating surface is streamed LLM output — server-rendered markdown
whose termination visibly advances, with the parser/highlighter never
shipped to the client — but the shape is general: long-job progress
(imports, builds, deploy logs), agent/tool-call transcripts, search
results refining as shards answer. Anything "eventually-complete markup".

## Authoring model

```js
"use server";
export async function* reply(prompt) {
  let text = "";
  for await (const tokens of generate(prompt)) {
    text += tokens;
    // Each yield is a complete render of the CURRENT state.
    yield (props) => <Markdown source={text} footer={props.status} />;
  }
}
```

Rules:

- Each yield must be a component (`props => JSX`) — the same contract as
  the single-value form. Yielding data is a type error at the transform.
- Each yield renders **to completion** (async holes settle) before its
  html emits; the next yield is not consumed until the previous render
  flushed (natural for-await backpressure).
- The generator returning ends the stream (`complete`). A throw emits the
  stream-level `error` chunk; markup already applied stays.

## Protocol fit (what does NOT change)

- Wire: no new chunk types. Multiple `html` chunks for one id/version are
  already legal for the client store (`root.value !== appliedRootValue`
  → morph). Shipped clients handle this today.
- Slot records: re-sent records with equivalent args dedupe (occurrence
  state survives every emission); changed args flow through live props.
  These are the existing rules — the contract here is that they apply
  **per emission**.
- DR-2 args: async slot args (a `stats` promise, a token iterator) settle
  on the same data channel, typically at generator completion.

## What DOES change (the reviewable surface)

1. **`renderServerComponent` / the transform** detect an async generator
   result (`Symbol.asyncIterator` on the awaited function result) and run
   the render loop: render yield → emit html → next. One `start`, one
   `complete`, one sink; per-yield renders share the frame id/version.
2. **Fragment/segment keys across yields**: fragment names restart per
   render pass (`pl-0`, ...). Within one response, a second yield's
   segments must not collide with the first's revealed bookkeeping.
   Options: (a) prefix segment keys per emission (`e2:pl-0`), or (b)
   forbid `<Loading>` segments inside generator yields for v1 (each yield
   is already a settle point — deferred segments inside a tick are a
   degenerate case). **Recommend (b) for v1**, diagnosed loudly.
3. **Document SSR** (`t=0`): what does a generator boundary render into
   the document?
   - v1 (cheap, defensible): consume to **first yield** for the inline
     shell; the client adopts it and immediately refetches to resume the
     generation post-load. Correct but re-runs the generator.
   - v2 (full): keep emitting into the document stream like a pending
     fragment (the doc stream already stays open for `<Loading>`
     fragments); adoption mid-generation continues from the same stream.
     Needs the region-record path to carry repeated html for one id.
   **Recommend v1 now, v2 only if a real consumer needs it.**
4. **Single-flight / preload**: a mutation invalidating a generator
   component re-runs the generator; its regions ride the mutation
   response with the same per-emission semantics. A hover preload warms
   the store progressively — no special casing expected, but must be
   covered by tests.

## Costs to name

- Each emission re-renders the component and re-ships the full snapshot:
  O(n²) wire over reply length at token granularity. Batching (sentence /
  ~100ms ticks) is the intended usage, and streamed brotli compresses
  repeated HTML extremely well — but the docs must say "yield snapshots,
  not tokens".
- Server holds the response open for the generation's lifetime (same as
  any streamed fragment; abort handling must cancel the generator —
  `return()` on client disconnect).

## Reviewed alternatives (from review discussion, 2026-08-05)

**Append-only / commit-complete-blocks emission** (devagr): rejected as the
emission model. Mid-stream markdown is unstable — new tokens *revise* prior
markup (`**bold` closing, a paragraph becoming a list item, a code fence
rewriting the parse) — so an append-only protocol cannot express the
correction, and waiting to commit completed blocks is both worse UX and
unsafe (a block's completeness is only known when the next block starts).
This instability is the argument FOR snapshot yields: each yield re-parses
the full accumulated source, ambiguity resolution is free, and the client
morph makes "previously rendered stuff got edited" the designed-for path.

**Server-side diff → patch ops on the wire** (devagr): a legitimate future
*transport*, not a competing design. Points established in review:

- The client's DOM operations would not change: the DR-5 identity-first
  morph already computes the minimal patch client-side against the real
  DOM. Server diffing only moves where the diff runs and what crosses the
  wire.
- No VDOM needed even then — the server would diff consecutive *renders*
  (strings/structure), not maintain a retained tree; nothing re-renders
  client-side.
- The real cost is the address space, not the diff: wire patch ops need
  stable references into a DOM containing client-owned slot ranges the
  server must never touch, plus versioned resync for recovery. Snapshots
  are self-healing (every emission is the whole truth; mid-stream joiners
  need no replay).
- The wire gap is smaller than the O(n²) suggests: streamed brotli
  backreferences the repeated prefix across chunks, so emission N+1 costs
  roughly its novel bytes. Measure before optimizing.
- Precedent if it's ever earned: DR-2 case 3 ratified "snapshot once,
  deltas after" for container data. Because the authoring contract is
  yield-a-snapshot, a patch-op chunk type slots in later as a pure
  transport optimization with zero authoring change.

**Pagination / infinite scroll**: shares the *consumption surface*, never
the producer. The generator form fails pagination on all three of its
deltas from a local generator: the wire is server-paced (eager drain would
fetch every page immediately, and the demand signal IS the feature),
pull-pacing one response requires the bidirectional channel the stream
doesn't have (a held connection per scroll session), and pausing a
generator across separate requests means holding an unserializable
generator frame — sticky server sessions, which the request-scoped
architecture pointedly lacks (t=0 resume would also re-run from page 1).
Pagination's producer is cursor-shaped calls — one request per pull:
independently cacheable, preloadable, retryable, adoptable — optionally
wrapped client-side in a lazy AsyncIterable adapter so both forms feed the
same consumption type (noting the semantics differ: streaming reads
latest-yield, pagination reduces into an accumulated list). Paginated
*markup* needs no new protocol at all: it decomposes into one
server-component call per page keyed by cursor, appended into a
client-owned list — page N+1 is a NEW boundary, never a rewrite, so
nothing re-ships and per-page caching/preload/retention fall out of the
existing identity model. One sentence: server-paced markup that settles =
this proposal; client-paced markup that accumulates = a list of per-cursor
boundaries (exists today); the streamed generator is never the pagination
tool.

## API surface, consolidated (across the family)

Three tiers, one consumption surface (`AsyncIterable` + the existing
component/slot model); only the producer varies.

1. **Streamed server component** (this proposal): `"use server"` async
   generator yielding components. Client side unchanged — `dynamic()` over
   the call, slot fills as props. Yields share one props contract
   (occurrence identity persists across emissions); `return` completes;
   `throw` is the stream error, applied markup stands. Generation state
   (caret) is a userland DR-2 arg, not API.

2. **Data generator server function** (promote the current accident to
   contract): same authoring, yielding serializable data. Decision
   recommended: the transform statically detects the generator export and
   the stub **preserves the authored calling convention** — calling it
   returns an `AsyncIterable` immediately (internally awaiting the fetch),
   not `Promise<AsyncIterable>`. That makes `for await` direct, the memo
   latest-yield read one hop, and `asyncArg(fn(...))` a natural slot arg.
   Contract work: client `return()` aborts the response (break cancels
   server work); documented limits — server-paced (no backpressure),
   one-directional (no `next(value)` / `throw()` in), single cursor per
   response value (cache-and-share has no replay semantics).

3. **Pagination**: no new API. Cursor-shaped server components, one call
   per page, `next` crossing the slot border as plain data, client appends
   boundaries into its own list (`For` over cursors). Per-page address =
   per-page caching, hover preload, away/back retention, nothing
   re-ships. A helper is deliberately deferred until real apps repeat the
   pattern — it's a small userland wrapper.

## Open questions for review

- Is the yield-a-component contract right, or should yields be prop
  patches / partials? (Snapshot-of-state is simpler and morph-friendly;
  partials reintroduce ordering problems the store model was built to
  avoid.)
- Should the client expose generation state (`generating` vs `complete`)
  to the mount — e.g. for a blinking caret — via the existing `onApply`
  reasons, a store flag, or nothing (userland can pass a DR-2 arg)?
- Interaction with the shell gate: the gate releases on FIRST apply —
  correct for generators by construction (first yield = first content),
  but worth a test.
