# Design: Client-Side CSS Reveal Gating (FOUC parity with SSR streaming)

> **Status: design/plan — nothing here is implemented.** Written against
> `dom-expressions` `next` (post-`130a06e1`) and `solid` `next`
> (post-`b6071ba6`). Companion to `docs/head-management-rfc.md` (the head
> registry this extends). Self-contained: intended to be handed to a fresh
> agent/worktree.

## Problem

SSR streaming has a complete anti-FOUC story: CSS discovered during server
render streams ahead of content, and streamed fragments do not reveal until
their stylesheets have *loaded* (`$dfs`/`$dfc` gating). The client has no
analog. A `useHead` stylesheet mounted during a client-side transition
starts fetching **at commit time** and gates **nothing** — the user sees
unstyled content for the full duration of a CSS fetch on every non-cached
navigation.

This is a double defect, not just a missing wait:

1. **No fetch overlap.** Client `useHead` runs as `effect(compute, apply)`
   (`packages/runtime/src/client.js`, `useHead` → `acquireHeadResource` in
   the *apply* phase). Under a transition, effect applies are held until the
   transition completes — so the stylesheet `<link>` is inserted at the
   exact moment the new content becomes visible. The data wait and the CSS
   fetch are fully serialized.
2. **No gate.** Nothing on the client observes a stylesheet's `load` event.
   Transitions and `Loading` reveals are data-driven only; there is no
   client seam equivalent to `$dfs` ("this reveal also waits on an asset").

## Current-state matrix (verified against source, Aug 2026)

| Scenario | CSS handling | FOUC? |
| --- | --- | --- |
| SSR shell render | Discovered CSS (asset manifest `registerAsset`, plain `useHead` stylesheets) joins `<head>` before body; browser render-blocks | No |
| SSR streamed fragment | Fragment CSS streams with the fragment; `$dfs(key, n)` gate + `onload="$dfc(key)"` on each link defers the `$df` swap; reveal groups (`$dfj`/`$dfg`) respect gates group-wide | No |
| SSR `useHead` stylesheet under a boundary | Added to `tracking.boundaryStyles` when *gateable* (see below) → same `$dfs` gate; at root → shell head | No |
| `renderToString` | Whole document at once; head links block first paint natively | No |
| Hydration (lazy `_assets`) | CSS already server-emitted; `loadModuleAssets` fetches JS only (native `@vite-ignore` import) | No¹ |
| Client `lazy()` in a transition | Module promise is an async source (transition holds); chunk CSS awaited by the **bundler** (Vite `__vitePreload`, webpack `mini-css-extract`) | No² |
| Client static-import CSS | Bundler (injected at module load / built into the document) | No² |
| **Client `useHead` stylesheet (transition, `Loading` reveal, or initial CSR)** | Link inserted at effect-apply (commit); no load observation | **Yes — the gap** |

¹ Relies entirely on server-side asset tracking having emitted the CSS; the
client import does no CSS handling of its own. Contract, not gap.
² The guarantee is the bundler's, not ours. Native-ESM / import-map /
`solid-html` setups get no CSS wait on dynamic import. **Non-goal** here:
that is bundler territory, and those setups have no chunk-CSS concept.

**Gateability** (shared classification, `packages/runtime/src/head.js`
`STYLESHEET_FETCH_META`): a stylesheet is gateable when its extra attributes
are pure fetch metadata (`crossorigin`, `integrity`, `referrerpolicy`,
`fetchpriority`). Condition-changing attributes (`media`, `title`/alternate,
`disabled`) exclude a sheet — holding a reveal on a sheet that may never
apply is worse than FOUC. The client design reuses this rule verbatim.

## Goals

- A gateable `useHead` stylesheet mounted inside a transition or `Loading`
  discovery pass holds the reveal until the sheet has loaded (or errored),
  exactly like the server's `$dfs` gate.
- The CSS fetch starts at **discovery** (compute phase), overlapping the
  transition's data wait, not serialized after it.
- Cached sheets add zero wait and (near-)zero overhead.
- `title`/`meta`/other replaceable tags never wait on CSS.
- No behavior change for non-stylesheet head tags, non-gateable sheets, or
  SSR paths.

## Non-goals

- Dynamic-import chunk CSS outside bundlers (see ² above).
- Font loading, image decoding, or any non-stylesheet asset gating.
- Gating on `@import`-ed sub-sheets (the `load` event of the parent link is
  the contract, same as the server gate).

## Design

### 1. Split resource acquisition: warm at discovery, own at commit

Today `acquireHeadResource` → `acquireAsset` both *mounts* the element and
takes *ownership* (refcount + removal-on-dispose), and runs at apply time.
Split it:

- **`warmAsset(descriptor)`** — idempotent, refcount-free, callable from the
  compute phase (may run multiple times; must not leak on re-runs). Ensures
  the fetch is in flight and returns the registry entry (with load state).
- **`acquireAsset(descriptor)`** — unchanged contract (ownership, release,
  grace-period removal), called from apply as today, adopting the warmed
  element.

**Warm mechanism — recommendation: `rel="preload" as="style"` first, flip
to `rel="stylesheet"` at acquire.** Two candidate mechanisms:

- (a) Mount the real `<link rel="stylesheet">` at warm. Precedent: the
  server streams fragment CSS into the document before reveal, so
  early-applying CSS is already accepted behavior on the SSR path. But a
  warmed branch can be **superseded before it commits**: transitions never
  abort in the 2.0 model (they always settle; a failed action rejects its
  promise but the transition still completes, and overlapping navigations
  entangle rather than cancel), yet the *branch* rendered under one can be
  replaced — navigate A→B before A reveals and A's owner is disposed, its
  pending effect applies cancelled as zombies. A's `acquireAsset` then
  never runs, so a real stylesheet mounted at warm time is left applied
  with no owner, forever (style leakage into whatever is on screen).
- (b) Mount `rel="preload" as="style"` at warm; at acquire, flip `rel` to
  `stylesheet` (applies instantly from cache, no second fetch). A warmed
  branch that never commits leaks only an inert preload (harmless, and
  the fetch is cached for whenever the route is revisited), and the
  preload's `load` event drives the gate. Costs one attribute flip.

(b) is recommended. Note the flip must preserve fetch-identity qualifiers
(`crossorigin`, `integrity`) or the preload cache is bypassed — reuse
`RESOURCE_QUALIFIERS`.

### 2. Load state in the asset registry

Extend registry entries (`assetRegistry`) with load tracking:

```
entry.loadState: "pending" | "loaded" | "errored"
entry.loadPromise: Promise<void>   // resolves on load OR error (never rejects)
```

- Created at warm; `load`/`error` listeners set the state and resolve.
- **Adopted server elements** (hydration, `findAssetElement` path): if
  `link.sheet != null` → already loaded; else attach listeners. A preload
  link exposes no `.sheet`; for adopted preloads fall back to listeners
  plus a `performance.getEntriesByName(href)` check for the already-loaded
  case (or simply re-check `sheet` after the rel flip — detail for
  implementation).
- `error` **releases the gate** (parity with `onerror="$dfc"` on the
  server). No timeout, same as the server gate. A dev-mode `console.warn`
  after ~10s of pending would be a reasonable diagnostic, but is optional.

### 3. The gate: stylesheet load as an async source

The client analog of `$dfs` should not be a bespoke mechanism — it should
ride the transition machinery the same way this repo just consolidated the
server head-hold into the flush loop (`130a06e1`): **an unloaded gateable
sheet reads as not-ready**, and the existing async-source plumbing
(entanglement, retry-on-settle, `Loading` fallback holds) does everything
else.

Spelling: a small **rxcore seam** (mirroring `ssrHandleError`'s probe-mode
addition on the server side):

```
// provided by the reactive library through the rxcore bridge
waitAsset(promise: Promise<void>): void
// throws NotReadyError bound to `promise` if it has not settled;
// no-op once settled. Tracked contexts retry when it settles.
```

In `useHead`'s compute (per the grouping in `useHead`, client.js ~950):

- For each **gateable stylesheet** resource descriptor: `warmAsset(...)`,
  then `waitAsset(entry.loadPromise)` **in a per-resource child
  computation**, not in the group compute — otherwise the registration's
  replaceable tags (title/meta) would also wait on CSS, violating a goal.
  Concretely: resources split out of the main compute into per-identity
  `effect`s (or one keyed computation over the resource list) whose compute
  warms + gates and whose apply acquires.
- Non-gateable sheets and other resources (preload hints, scripts): warm
  optionally (fetch earliness is still free), never gate.

Behavior that falls out with **zero additional mechanism**:

- **Transition**: the per-resource compute throws NotReady → the transition
  adopts the source and holds; when the sheet loads, the compute retries,
  passes, and the transition can complete. Reveal waits for CSS *and* the
  fetch overlapped the data wait (warm ran at discovery).
- **`Loading` boundary (initial mount)**: NotReady during discovery holds
  the fallback until the sheet loads — consistent with how async data
  behaves in the same position.
- **Initial CSR render outside any boundary**: **no reactive gate**
  (ruled 2026-08-06). Before first paint the browser's paint-hold covers
  the window: an in-flight head stylesheet holds first paint, so there is
  no flicker to prevent and blocking the root render would only duplicate
  the platform. Since script-inserted sheets are not *formally*
  render-blocking (paint-hold is browser behavior, not spec), warm links
  inserted while the document is still render-blocked are stamped with the
  native `blocking="render"` attribute, which makes the hold contractual.
  The reactive gate applies only where the page is already painted and the
  platform has no mechanism: transitions and boundary reveals.
- **Cached sheet**: `loadPromise` already settled → `waitAsset` no-ops →
  no wait, no retry, no extra frames.

### 4. What the seam costs

`NotReadyError` lives in `@solidjs/signals`; `solid-web`'s rxcore bridge
(`packages/solid-web/src/core.ts` in the solid repo) must export
`waitAsset` (trivial: `if (unsettled) throw new NotReadyError(promise)`;
the promise-settled bookkeeping lives in the asset registry entry, so the
seam itself is ~5 lines). Other renderers supply their own or a no-op —
same graceful degradation as other optional rxcore members
(`loadModuleAssets`, `captureBoundaryScope`).

## Implementation plan (phased, one worktree)

1. **rxcore seam** (solid repo): export `waitAsset` from the web-runtime
   core bridge; type in `client.d.ts` rxcore surface. Changeset:
   `@solidjs/web` minor (new seam member).
2. **Asset registry load state** (dom-expressions): `warmAsset`, load
   listeners/state, preload-flip mechanics, adopted-element detection.
   Unit-testable in isolation (jsdom `link` load/error dispatch).
3. **`useHead` compute restructure** (dom-expressions): per-resource
   gating computations; group compute keeps replaceable tags only.
   Careful with: reactive group membership re-runs (`typeof tags ===
   "function"`), registration seq stability, release ordering on rerun.
4. **Integration tests**:
   - dom-expressions `test/dom/head.spec.js`: warm-at-discovery timing,
     gate hold/release on load and on error, cached-sheet no-wait,
     non-gateable sheets don't gate, title/meta apply un-gated.
   - solid `packages/solid-web/test/client`: transition over a route swap
     with a `useHead` stylesheet — reveal order asserted against mocked
     link load events; `Loading` fallback hold on initial mount; a branch
     superseded before commit leaves no applied sheet (preload inertness,
     zombie-cancelled apply never acquires).
   - Hydration parity: adopted server-emitted links count as loaded, no
     re-fetch, no gate stall.
5. **Size/perf pass** (required): client.js rides the `@solidjs/web`
   budget. The head registry is tree-shaken when `useHead` is unused —
   keep the gating code inside that boundary so non-head users pay
   nothing. Measure `signals: + createStore` and web-runtime budgets
   before/after; expected cost is small but nonzero (~300–500 B min).

## Resolved questions (ruled 2026-08-06)

1. **Bare CSR first paint: no reactive gate.** Browsers paint-hold on
   in-flight head stylesheets before first paint, so the platform already
   covers the initial-render window; gating there would duplicate it. Warm
   links inserted while the document is still render-blocked carry the
   native `blocking="render"` attribute to make the hold spec-guaranteed
   rather than heuristic. The reactive gate is scoped to where the page is
   already painted: transitions and boundary reveals.

## Open questions

1. **Explicit per-tag override — undecided; not needed for v1.** The
   candidate vocabulary is HTML's native `blocking` prop: explicit
   `blocking="render"` opts a tag *into* gating past the classification
   (e.g. a `media`-qualified sheet the author knows applies), explicit
   `false` opts out. In favor: native vocabulary over an invented option,
   and the attribute passes through to the DOM where it genuinely works
   pre-paint. Against: API surface ahead of demonstrated need (the
   gateability classification may be sufficient); the borrowed word shifts
   meaning (native = "block *document* render", ours = "block *this
   reveal*"); and the opt-out half (`blocking={false}`) is not native HTML
   anyway (absence is the native opt-out). Adding it later is fully
   compatible — v1 ships on classification alone unless ruled otherwise.
   (Independent of this: warm links inserted pre-paint are stamped
   `blocking="render"` per resolved question 1 — that is mechanism, not
   author API.)
2. **`solid-element` / universal renderers**: no rxcore `waitAsset` → warm
   still helps (fetch earliness), gate silently disabled. Acceptable?
   (Matches how other optional seams degrade.)

## Risks

- **Deadlock shape**: a gate inside a transition whose completion is what
  would insert the link — cannot happen with warm-at-discovery (the fetch
  is started by compute, not by commit), but the per-resource computation
  restructure must keep it that way; test explicitly.
- **Preload double-fetch** if qualifiers drift between preload and
  stylesheet form — covered by reusing `RESOURCE_QUALIFIERS`.
- **Effect-compute purity**: `warmAsset` mutates the DOM (inserts a link)
  from a compute phase. It is idempotent and commutative (registry-keyed),
  and the DOM head is outside the reactive graph, but it is a deliberate
  exception to compute-phase purity — document it at the call site.
