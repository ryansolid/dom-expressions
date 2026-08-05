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
