---
"@dom-expressions/runtime": patch
---

**Experimental — server components over frame streams.** This ships as an
experimental preview: it will ride the Solid 2.0 release line, but its API
and wire format are NOT covered by 2.0's stability guarantees and may
change between prereleases while the design settles. The supported app
surface is the `@solidjs/web/frames` facade; everything exported from this
package's frame modules is integrator-level.

The idea, in one invariant: **everything ships once**. Server content
travels as HTML; values the client needs travel as data records; nothing
travels as both. View-source the page or a navigation response and search
for any piece of content — it appears exactly once. A server component is
just a function returned from a server function; its props are client
positions (slots) the server marks but never renders; the client owns
boundary identity, so refetching into the same boundary morphs server
content in place and client state inside survives.

What this adds:

- **Producer** (`frame-sink.js`): `renderToFrameStream` /
  `renderServerComponent` render through the shared streaming core and emit
  the transport-agnostic `FrameChunk` stream instead of a document —
  `start`/`assets`/`html`/`data`/`fragment`/`reveal`/`template`/`block`/
  `slot`/`complete`/`error`. Prop reads emit `slot:` marker ranges; render-
  prop calls emit occurrence-keyed `slot` chunks (primitives literal,
  everything else `{ $ref }` codec records); server JSX passed through
  client props streams as nested frame regions — html once, zero data.
  Errored fragments reveal their fallback AND surface a keyed `error`
  chunk. `serverComponentResponse` / `frameTransformResult` (a
  `transformResult` policy for `handleServerFunctionRequest`) serve it all
  over the server-function wire, tagged `X-Frame-Stream`.

- **Client runtime** (`frame-client.js`): a resident keyed record store
  applying chunks into DOM boundaries — order-independent by construction,
  version as stale-guard only ("policy A": newer content morphs in place;
  teardown is `dispose()`, never a version bump). A slot-range-preserving,
  zero-allocation morph (CI-guarded smaller than micromorph); fragment
  placeholder ranges with reveal readiness and fallback materialization;
  the slot model (direct-insert + render-function callbacks, occurrence
  identity via `$key`, `{$frame}` region args, `ctx.existing` claims);
  multi-mount fan-out with sibling-store seeding; the bubbling
  `frame:applied` document event.

- **Transport policy** (`frame-transport.js`):
  `createServerComponentHandler` resolves a frame-stream response to a
  STABLE per-call-site component — boundary identity derives from a
  context captured synchronously at the call site (e.g. an owner), so an
  equals-gated consumer never remounts across refetches. Seams: `capture`,
  synchronous `intercept` (t = 0 local answers with no pending beat),
  `documentComponent` (adopt a boundary the page already carries),
  `onStream` (rotate response-scoped codec tables).

- **Document SSR, t = 0** (`frameTransformDirectResult`, the in-process
  mirror of `frameTransformResult`): server components render INLINE in
  the initial document — client wrappers render server-side inside their
  slots (the one hydration-time exception) under per-occurrence
  hydration-key scopes, so the adopting client re-renders each slot under
  the same keys and claims the server-rendered DOM in place. Boot makes
  zero requests: the page is the payload. Content a wrapper never rendered
  during SSR (collapsed threads) flips transport automatically: it ships
  once as data records — async regions as promise records that patch when
  they settle — and mounts client-side from the store with zero network.

- **NoHydration zones**: server-owned output renders under solid's
  `NoHydration` semantics on both the document and stream paths — no
  per-element hydration keys, no async-value hydration records (adopted
  markup's HTML IS its data); client slots re-enter via `Hydration` under
  their occurrence namespace. Ids are still consumed, so sibling key
  sequences and fragment/Loading ids are untouched.

- **Element claims for server content**: the frame runtime sweeps every
  subtree it materializes against the compiled runtime's element-claim
  registry (`claimElementTree`; registry shared across bundles via a
  registered symbol) and re-claims claimable elements whenever a morph
  touches their attributes — a router's link-state layer sees
  server-rendered anchors and forms exactly like compiled ones, with
  cleanup scoped to the boundary's owner via the `ownerScope` frame
  option. Dormant without a registered consumer.

- **Keyed JSON codec**: `createJSONSerializer` / `createJSONDataTable` —
  eval-free SerovalNode data records with cross-write referential dedupe
  and promise/stream patching; frame streams default to it. Server-function
  args gain a JSON fast path (rich argument serialization stays available
  as the tree-shakeable `enableRichArguments()` opt-in).

Apps that import none of this pay **zero bytes** — enforced by the same CI
size guard that caps the full consumer (runtime + transport + codec glue)
at ~6.5 KB min+gzip for an app already using server functions.

Docs: `docs/server-components.md` (usage-first) and
`docs/frame-streams-rfc.md` (wire format and runtime mechanics).
