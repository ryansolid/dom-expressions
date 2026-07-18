# dom-expressions

## 0.50.0-next.23

## 0.50.0-next.22

### Patch Changes

- e8a78a8: Add the server function runtime ABI under `src/server-functions/` — the platform-neutral halves of the transport hoisted from SolidStart, for bridging through `@solidjs/web/server-functions`:
  - `shared.js`: the wire contract both peers must agree on — neutral header names (`X-Server-Function-Id`, `X-Server-Function-Instance`, `X-Server-Function-Format`, `X-Server-Function-Error`), body-format negotiation for values with a natural HTTP encoding, length-prefixed chunk framing over the JSON codec from `serializer.js` (async values stream on one connection), and `decodeResponse(response)` for integrations decoding responses the transport hands over whole. Codec configuration lives here in the universal layer so routers (including custom ones, in non-DOM environments) depend only on this module — never on the fetch transport or a renderer.
  - `client.js`: the fetch transport. `createServerReference(id)` produces the client callable with the `url` / `GET` / `withOptions` surface; `configureServerFunctionsClient` sets the endpoint (default `/_server`) and codec options.
  - `server.js`: registration (`registerServerReference`, `registerServerFunction`, `getServerFunction`), the SSR in-process callable (`createServerReference`, runs under a derived request event carrying `serverFunctionMeta`), and a web-standard `handleServerFunctionRequest(request, options) => Response` handler. Event provisioning is injected (`configureServerFunctionsServer({ provideEvent, endpoint })`, falling back to the AsyncLocalStorage a request scope parks on `globalThis[RequestContext]`) so the module stays free of node built-ins; `endpoint` mirrors the client config so SSR'd reference `url`s (e.g. form actions) respect a base path. `transformResult` and `handleNoJS` hooks are the extension points for framework policies (single-flight payloads, no-JS form conventions); platform adapters (h3, express) wrap the handler.

  Protocol refinements over the SolidStart original: the `customBody` expando is gone in both directions — integrations decode passthrough responses with the exported `decodeResponse` instead of a monkey-patched lazy decoder, and `transformResult` implementations return a `ResponseEnvelope(response, value)` when they need to send HTTP metadata plus a structured payload. The eval-based "js" serialization mode was deliberately left behind — the framed JSON codec is the only wire format. The ABI naming follows RSC conventions: `registerServerReference(id, fn)` registers, `createServerReference` creates the callable proxy (from an id on the client, from a reference during SSR) — the old `cloneServerReference` name is gone. The hand-written type declarations document the full surface, with compiler-ABI and wire-detail exports tagged `@internal` so docs generators skip them (downstream `@solidjs/web` copies these d.ts files verbatim).

  Also adds `src/response.js` — the response helpers (`redirect`, `reload`, `respond`) and the `ResponseEnvelope` class, as a standalone dependency-free module destined for `@solidjs/web`'s core entry rather than the server-functions subpath. They are more generic than the transport: client-only actions return them and the integration interprets the `Response` in memory, while server functions return (or throw) the same objects and the HTTP handler forwards their metadata (`Location`, `X-Revalidate`, statuses — all expressed through the standard Response API). `respond(value, init)` — `json()` from SolidStart/Solid Router, renamed for what it actually does: pair a value with the response metadata a naked return can't express. Progressive enhancement stays invisible: the carried response holds a plain JSON body so consumers without the client runtime (no-JS form posts, direct HTTP) get real JSON, while integrations read `value` with no reparse. Envelope detection uses a registered-symbol brand (`isResponseEnvelope`) rather than `instanceof`, so identity survives the core and server-functions entries bundling separate copies of the module. Revalidation keys are opaque strings; whatever keyed cache the integration brings assigns them meaning.

- 201bf45: Deduplicate the `DOMElements` set literal: the array concatenated a categorized list with a full alphabetical list, shipping 286 entries where only 149 are unique — ~1 KB minified in any bundle that retains the set. Membership is byte-for-byte identical (consumers only do `.has()` checks); tree-shaken apps that never touch it still drop it entirely via the existing `/*#__PURE__*/` annotation, so this pays off for star-import, CDN, and non-tree-shaken consumers.
- 96aa81d: Hydration-time behaviors reached from hot client paths — `insert()`'s initial-claim and swapped-region reclaim walk, `insertExpression`'s hydration gate, and `eventHandler`'s replay dedup — move behind a nullable runtime slot installed by `hydrate()`. Client-only bundles shake the implementations (~450 min / ~194 gzip bytes under esbuild-class bundlers; Rollup-based bundlers already proved these paths dead and are byte-identical). `installHydrationRuntime()` is exported for embedders that simulate hydration state without entering through `hydrate()`.
- 174474c: `RequestContext` is now a registered symbol (`Symbol.for("solid.RequestContext")`). The AsyncLocalStorage a request scope parks on `globalThis` must be found by every copy of the module — downstream, the core server entry and the server-functions entry bundle separately, each carrying a copy of the code that reads it.

## 0.50.0-next.21

### Patch Changes

- 8e54049: Expose reusable Seroval serializer primitives from the runtime's serializer module. `createSerializer(options)` builds a streaming serializer preconfigured with the default web plugin set (custom plugins compose ahead of the defaults and can shadow them) and the ~ES2017 feature policy, targeting a caller-provided `globalIdentifier`. The SSR-specific configuration (pinned `_$HY.r` global) moves to `createHydrationSerializer(options)`, which `renderToString`/`renderToStream` now use internally — hydration output is unchanged. `DEFAULT_WEB_PLUGINS` and `resolveSerializerPlugins(customPlugins)` are also exported, the module's type declarations are corrected to match the implementation (they previously declared a nonexistent default export), and the render options' `plugins` typing is tightened from `any[]` to `SerializerPlugin[]`.

  The module also gains an isomorphic JSON codec for RPC-style transports (e.g. server functions): `serializeJSON(value, { onParse, onDone, onError, ... })` streams a value as `SerovalNode` chunks (async values continue streaming as they resolve), and `createJSONDeserializer(options)` returns its decoding counterpart with cross-chunk reference state. Both share the web plugin resolution, and default to a transport-hardened policy (RegExp disabled, parse depth capped at 64) that can be overridden per peer. Wire framing of chunks is intentionally left to the transport. This is groundwork for sharing one serialization configuration between SSR hydration and server function transports.

- e717d06: Fix streamed fragment swaps leaving fallback content behind when the fallback contains unrelated comment markers.
- 2c4ab6b: Raise the seroval / seroval-plugins peer dependency floor from `~1.5.0` to `~1.5.4`: seroval 1.5.3 and earlier are affected by a security issue fixed in 1.5.4.

## 0.50.0-next.20

### Patch Changes

- 9d5a90b: Queue streamed fragment activations whose `pl-*` marker is not yet in the live DOM instead of silently dropping them.

  A fragment's marker can sit inside a flushed-but-unactivated ancestor `<template>` (a slot held by a reveal group). Template content is inert, so `document.getElementById` cannot see the marker and `$df`/`$dfl` previously returned `0` and lost the swap permanently — the fallback stayed stuck even though the content template had streamed. Today this window is masked because the server enrolls nested boundaries into the ancestor reveal group, but fixing that enrollment (solidjs/solid#2871, solidjs/solid#2872) makes nested boundaries activate independently, exposing the drop.

  `$df` and `$dfl` now queue marker misses (`_$HY.dq` / `_$HY.dlq`) and a new `$dfd` drains both queues after every successful swap or fallback materialization — the only events that can bring queued markers into the live document. Content swaps drain before fallbacks so a settled fragment wins over its own pending fallback, and drains cascade through arbitrarily nested held levels. An activation whose content template is already consumed remains a plain no-op and is never queued.

## 0.50.0-next.19

### Patch Changes

- 75de952: The `manifest` option of `renderToString`/`renderToStream` now also accepts a
  resolver — `{ resolve(key), resolveSync?(key) }` — as an alternative to a
  static manifest object, letting dev servers answer asset lookups from their
  live module graph while production keeps passing the built manifest object.
  `resolve` may return a promise and may resolve CSS entries to inline-style
  descriptors (`{ id, content, attrs }`) for HMR adoption; `resolveSync`
  answers with what is knowable without async work (typically js URLs) for
  sync consumers like a lazy component's `moduleUrl` getter used by islands,
  and is exposed on the render context as `resolveAssetsSync` (object
  manifests, being sync by nature, expose it too). A bare function is accepted
  as shorthand for `{ resolve }`. The consumer contract stays
  `renderToStream(fn, { manifest })` in both modes. Entry-asset
  auto-registration only applies to object manifests, since a resolver cannot
  be enumerated for entries.

## 0.50.0-next.18

## 0.50.0-next.17

### Patch Changes

- ef2864e: Add a client-side asset registry and an `inline-style` server asset type, closing the CSS lifecycle loop for SSR'd applications.

  **`acquireAsset(descriptor)` (client)** — ref-counted ownership of shared document assets. Consumers (routers, lazy wrappers, metadata components) acquire an asset when content that needs it mounts and call the returned release function on cleanup:

  ```js
  const release = acquireAsset({ type: "style", href: "/assets/route.css" });
  // … on unmount:
  release();
  ```

  - First acquire creates the element in `<head>` — or adopts an SSR/stream-emitted one (links matched by `href`, inline styles by their `data-asset` id) instead of duplicating it.
  - Last release removes the element after a short grace period, so release/re-acquire cycles during route transitions keep the live stylesheet instead of flashing unstyled content.
  - Supported descriptors: `{ type: "style", href, attrs? }`, `{ type: "inline-style", id, content?, attrs? }`, `{ type: "module", href }`.
  - Additionally, `{ policy: "exclusive", key, value, get, set }` provides singleton-slot semantics (last-writer-wins with restore-on-release) as the substrate for future `<Title>`/`<Meta>`-style metadata components.

  **`registerAsset("inline-style", { id, content, attrs? })` (server)** — registers CSS by content rather than URL, for styles that have no `.css` file to link (dev-mode CSS collected from the bundler's module graph, critical CSS). Entries dedupe by `id` and emit as `<style data-asset="…">` tags: in `<head>` for anything registered before the shell flushes, inline in the stream for late boundary styles. Extra `attrs` pass through to the tag (e.g. `data-vite-dev-id` so Vite's HMR client adopts the server-rendered style in dev). Unlike stylesheet links, inline styles never gate streamed fragment reveal — they are applied as soon as they are parsed.

- 241ff76: Fix a spread element with dynamic props being left unclaimed on hydration. `mergeProps` with a function source creates a memo, which consumes a hydration child id. The ssr generate evaluated `mergeProps(...)` in `ssrElement`'s argument position — before the element's own hydration key was allocated — while the client claims the element (`getNextElement`) before applying the spread. The element's id shifted by one on the server and the client re-created it instead of claiming (later siblings re-synced, hiding the drift; a `<title>` rendered this way duplicated on every hydration). The ssr generate now defers the merge behind a thunk when hydratable and `ssrElement` allocates the hydration key before resolving function props, matching the client's allocation order.
- 2c6852f: Root-level inserts no longer wipe foreign sibling nodes when clearing or replacing their content. Streaming appends late-flushed `<link rel="stylesheet">` tags to the end of `<body>`, inside the region a document-level hydration root tracks; previously a root expression that emptied (`textContent = ""` fast path) or swapped to text took those links with it, dropping loaded CSS (FOUC). `insert` now removes only the nodes it tracks when the parent contains children it doesn't own, keeping the fast path when it owns everything. Also documents that `registerModule` / `loadModuleAssets` mapping keys are opaque to the runtime — the reactive library chooses them (e.g. hydration ids) on both sides of the wire.
- 2275d59: Align SSR serialization of non-string attribute values (arrays, objects) with client-side `setAttribute` coercion so both environments produce the same final attribute string.

## 0.50.0-next.16

### Patch Changes

- f2e56fe: fix(client): re-claim a hole's live DOM region when a streamed `$df` fragment swap replaced its tracked nodes mid-hydration (solidjs/solid#2801 bug 1, pending-stream case). A Loading fallback claimed during hydration is swapped out by `$df` before the boundary resumes; insert's node bookkeeping still pointed at the removed fallback, so the content pass fabricated detached text nodes and the first post-hydration refresh appended duplicates. When the tracked nodes are disconnected while hydrating, insert now re-derives the region (parent children, or back to the matching `<!--$-->` for marker-bounded holes) so loose text re-claims positionally — elements already recovered via `_hk`.
- b431fe7: Handle module preload failures during hydration instead of hanging silently (solidjs/solid#2817 layer 3). `loadModuleAssets` drops rejected entries from the loading cache so later boundaries/navigations can retry, and the root `_assets` path in `hydrate()` falls back to a fresh client render (with a console diagnostic) instead of leaving the page permanently dead.
- 016b460: Server rendering a plain (non-template) object child now dev-warns and skips it, matching the client, instead of crashing with `Cannot read properties of undefined (reading 'fn')` (solidjs/solid#2801 bug 6)
- c40ac21: Fix style object updates so shared or constant style objects are not mutated while diffing, and nullish property values correctly remove the applied style.
- c2a542b: Fix hydration key mismatches when async holes defer past eager siblings
  (solidjs/solid#2801 bug 2). Dynamic element children that can allocate
  hydration ids (conditionals, component-children access, call expressions)
  are now compiled with their own id scope on both generates: the dom and ssr
  generates wrap the hole expression in a new `scope()` runtime helper using a
  shared predicate, so marking cannot desync.

  On the client, `scope(fn)` tags the accessor and `insert()` makes the outer
  render effect non-transparent (its own id scope) for tagged accessors; the
  inner unwrapping effect stays transparent so content ids keep a fixed depth.
  On the server, `scope` (framework-provided via rxcore as `ssrScope`) reserves
  one id slot at registration and evaluates the hole — including async retries
  — under that reserved id with a zeroed child counter, so retry timing can no
  longer shift sibling ids. The ssr generate's `orderedInsert` sibling
  thunk-wrapping is removed; it is superseded by hole scopes.

  Hole content ids gain one nesting level (e.g. `_hk=10` instead of `_hk=1`)
  identically on both sides. rxcore implementations must provide an `ssrScope`
  export and honor a `scope: true` effect option (mapped to a non-transparent
  render effect).

- fa24389: Fix delegated events never reaching outer roots when a render root is
  rendered inside another root's DOM (embedded widgets, microfrontends).
  The first (innermost) container listener marked the event consumed for
  every other root, so an outer root's delegated handlers were silently
  skipped even though the native event bubbled through its elements: a
  plain `addEventListener` on the same element fired while the delegated
  handler didn't.

  `$$EVENT_OWNER` now records the boundary of the most recent walk instead
  of a consumed flag: an ancestor container whose subtree contains that boundary
  resumes the handler walk from it up to its own boundary, so each root's
  handlers fire exactly once, innermost-out, matching native bubbling.
  `stopPropagation()` inside a nested root still suppresses outer roots (it
  stops the native event before their listeners run), and hydration event
  replay now relays queued events through all matching roots innermost-first
  so pre- and post-hydration clicks behave identically. Apps that relied on
  nested roots to isolate clicks from outer handlers should use
  `stopPropagation()`, which remains the documented mechanism. Non-nested
  apps are unaffected; the resume path is unreachable unless an inner root
  already handled the event.

- 75b4ab2: Normalize manifest asset URL joining in `resolveAssets` (solidjs/solid#2817 layers 1-2). A non-string `_base` (e.g. a dev-manifest proxy answering every key) falls back to `/`, leading-slash `file` values no longer produce `//` URLs, and absolute/protocol-relative URLs pass through untouched — the server runtime emits sane module URLs for any reasonable manifest shape instead of relying on bundler plugins getting the contract exactly right.
- 668264f: Universal JSX now passes compile-time static host props to `createElement(tag, staticProps)` so custom renderers can configure nodes before children are inserted. Dynamic props and elements with spreads continue to use the existing `setProp` / `spread` paths.

## 0.50.0-next.15

### Patch Changes

- 42ca328: Awaited renderToStream (`then()`, which renderToStringAsync wraps) now waits out blocking promises and re-pulls pending root holes before completing, matching `pipe()`. Previously a render whose only async was a blocked root hole (e.g. `lazy()` or an async component source with no registered fragment) completed immediately with an unfinished shell.
- ed01d41: Source server `mergeProps` from rxcore like the client and universal entries instead of shipping a local copy. The local merger resolved function sources for key enumeration only — the per-key getter read values off the raw, un-invoked function — so SSR dropped spread props whose source is a function (`<div {...fn()}>`, `<Dynamic {...props}>`; solidjs/solid#2815). Prop-merge semantics belong to the framework core; renderers must now export `mergeProps` from their server rxcore module (the universal entry already required this).
- df03fb8: Move all packages under the `@dom-expressions` npm scope with new names:
  - `dom-expressions` → `@dom-expressions/runtime`
  - `babel-plugin-jsx-dom-expressions` → `@dom-expressions/babel-plugin-jsx`
  - `jsx-dom-expressions-compiler` → `@dom-expressions/jsx-compiler`
  - `hyper-dom-expressions` → `@dom-expressions/hyperscript`
  - `tagged-jsx-dom-expressions` → `@dom-expressions/tagged-jsx`

  The old unscoped names stop receiving `next` prereleases and remain in use
  only by the Solid 1.x maintenance line published from `main`.

  `lit-dom-expressions` is dropped from the prerelease line; it has been
  superseded by `@dom-expressions/tagged-jsx`.

  `@dom-expressions/jsx-compiler` now distributes prebuilt native binaries
  through per-platform packages (`@dom-expressions/jsx-compiler-darwin-x64`,
  `-darwin-arm64`, `-linux-x64-gnu`, `-linux-arm64-gnu`, `-win32-x64-msvc`)
  resolved automatically via `optionalDependencies`, instead of shipping a
  binary inside the main package.

## 0.50.0-next.14

### Patch Changes

- 910e5fe: Add `host` option to `insert` for portal-style slots. Top-level nodes managed by the slot are tagged with a live `_$host` getter after each update, replacing proxy-based DOM call interception. The mount parent is now a real element so slot-ownership checks (`parentNode` identity) behave correctly — fixes portal content accumulating on swaps (solidjs/solid#2757) — and tagging covers the `replaceChild`, reconcile, and hydration claim paths the proxy missed.
- 58284f7: Make `ClassValue` recursive so nested arrays type-check. The runtime already
  flattens arbitrarily nested class arrays (e.g. `class={["a", ["b"]]}`), but the
  type only allowed a single level. `ClassValue` is now `string | number |
boolean | null | undefined | Record<string, boolean> | ClassValue[]`.
- a9357a2: Universal renderer `render()` disposers now remove the top-level host nodes they mounted, matching DOM `render()` cleanup semantics. Custom renderers can provide `cleanupNodes(parent, nodes)` to override the default per-node `removeNode` teardown.

## 0.50.0-next.13

### Patch Changes

- a75a56b: Expose the `ClassValue` type from JSX and lit runtime declarations so consumers can type wrapper props against the supported string, object, and array class forms.
- 78bb855: Harden DOM-runtime insertion against nodes that have migrated out of their
  original slot between renders. Resolves the class of bugs reported as
  solidjs/solid#2030 (a new JSX value that wraps the previous slot's node) and
  solidjs/solid#2357 (a single node referenced from multiple sibling slots).
  Previously, `cleanChildren` and `reconcileArrays` could either throw
  `replaceChild` "new child contains the parent", or silently destroy the
  migrated node by trusting a stale `current.parentNode === parent` check.

  Every runtime insertion site (`appendNodes`, `insertExpression`'s
  element-node branch, the replacement path in `cleanChildren`, all four
  insertion sites in `reconcileArrays`) now tags the inserted node with a
  per-slot `$$SLOT` Symbol property carrying the slot's marker. Every
  destructive operation (`remove`, `replaceChild`, `insertBefore` against a
  sibling anchor) is now gated on parent-and-tag ownership: an untagged node
  is treated as unclaimed (the slot may manage it), a tagged node is touched
  only when its tag matches the current slot's marker. Foreign nodes — refs
  appended by user code, nodes that have migrated to another slot, content
  inserted by other runtimes — are left alone.

  The `tail.nextSibling` `after` anchor in `reconcileArrays` is also gated:
  if `a`'s tail has migrated, the `after` falls back to the slot's marker
  rather than reading a sibling pointer that now points into another slot's
  region. The symmetric end-swap fast-path (`a[0]===b[n-1] && b[0]===a[n-1]`)
  gains an anchor-ownership check so it cannot stage moves against a foreign
  front anchor; mismatched anchors fall through to the map branch which
  re-gates each destructive op.

  Scope: DOM renderer (`client.js`) only. `universal.js` is intentionally
  unchanged — universal hosts target older JS environments (Chrome 38+),
  expando writes on platform nodes can collide with proxy-based node wrappers,
  and the JSX-DOM-ref migration patterns this fix addresses are not idiomatic
  on non-DOM platforms. If a real case surfaces on a universal renderer it
  can be revisited with a host-appropriate storage strategy.

- f1bcd5f: Stop giving special compiler handling to `style:foo` and `class:foo` JSX namespace syntax, and rename the static compiler marker from `@once` to `@static`. `style:foo` and `class:foo` now fall through to literal HTML attributes (e.g. `<div style:border="1px solid black">` emits `style:border` verbatim).

  Internal optimizations still split `style={{...}}` into `setStyleProperty` calls and `class={{...}}` into `classList.toggle` calls.

- f17f7a1: Rename the generated event listener helper from `addEventListener` to `addEvent` so compiled browser bundles no longer introduce a binding that can shadow the native `window.addEventListener` method.
- a45b224: Dispose the partially-created reactive scope when `render()` (and the universal renderer's `render()`) throws during initial mount. Previously a synchronous throw inside the top-level component would orphan the root and, in the DOM client, leave the delegated-root counter bumped — leaking event-delegation state with no recovery path since the caller never receives the disposer. The throw still propagates; the cleanup just happens before it does. `hydrate()` benefits transitively because it delegates to `render()`.

## 0.50.0-next.12

### Patch Changes

- Port relevant maintenance fixes from the stable branch. Add `omitAttributeSpacing` for strict template attribute spacing, and align `server.js`/`server.d.ts` with the current `client.d.ts` export surface so isomorphic imports continue to resolve on the server.
- 64e9aee: Delegated events are now owned by render roots instead of the document by default. `render()` installs and disposes its delegated listeners with the root, `delegateEvents()` now only declares event demand, and additional listener containers can be registered explicitly for framework features that render outside the root.

## 0.50.0-next.11

### Patch Changes

- d5cd499: Remove `on:` namespace event support from compiler, runtime, JSX types, and renderer packages.

## 0.50.0-next.10

### Patch Changes

- afbe2ff: Optimize synchronous SSR function holes and plain template array resolution.

## 0.50.0-next.9

### Patch Changes

- d883fad: Schedule `insert()` function-child DOM writes when the parent insert effect is updating an existing slot. This lets async reads inside nested render effects hold the active transition before replacing already-mounted content, and mirrors the fix in the universal renderer.

## 0.50.0-next.8

### Patch Changes

- 858cf13: Fix `ssr()` double-invocation on bail paths.

  A function hole whose return value walked into the bail branch (e.g., an array containing a NotReady-throwing item) was being invoked twice: once by `tryResolveString` for sync probing and again by the fallback `resolveSSRNode(hole, result)`. For closures that read stateful getters such as JSX `props.children` — whose backing component rebuilds an owner subtree on each access — the duplicate invocation produced a second owner tree with a divergent hydration-key prefix that the client could not claim, surfacing as "Hydration completed with N unclaimed server-rendered node(s)" warnings.

  `tryResolveString` now evaluates each function node exactly once and threads the evaluated value through the bail object so `ssr()` can hand it to `resolveSSRNode` without re-invoking the original closure.

## 0.50.0-next.7

### Patch Changes

- 0bd165e: Preserve shared class tokens when diffing object keys that contain multiple class names.
  Ensure class-method JSX captures `this` before lifted DOM setup statements run.
- 2fe6310: Speed up DOM and universal reconcile's symmetric end-swap branch on reorder-heavy
  patterns (e.g. `<For>` reverse / large rotations).

  The trigger condition is unchanged
  (`a[aStart] === b[bEnd-1] && b[bStart] === a[aEnd-1]`), but the body now
  walks inward against a single stable front anchor (`a[aStart]`) instead
  of issuing two cross-anchored `insertBefore` calls per pair. Each move
  targets the same DOM position so the browser's adjacency cache stays
  warm and per-call native `insertBefore` cost drops sharply. The inner
  loop also continues consuming consecutive symmetric swaps without
  re-entering the outer dispatch.

  Behaviorally equivalent to the previous implementation: same DOM
  mutation count, same correctness surface, no false-positive widening.
  Validated against `dom-expressions` reconcile tests, the full Solid
  test suite, UIBench `tree/[500]/[reverse]`, and `js-framework-benchmark`
  `05_swap1k`.

- 10f3250: SSR: group contiguous attribute and `textContent` closures into a single
  `_$ssrGroup(() => […], N)` call per element so the runtime can resolve
  all `N` hole positions with one closure invocation instead of `N`. The
  compiler walks each top-level element's `templateValues`, identifies
  runs of `≥2` groupable entries (inserts/children break a run, preserving
  child isolation), and replaces them with one grouped declarator repeated
  `N` times in the `ssr(...)` argument list. `_$ssrGroup` tags the
  function with `fn.$g = N` so `ssr()` can dispatch through a fast path
  that's gated at the end of the typeof chain — non-function holes pay
  nothing for the new branch.

  For the async escalation path (group fn throws `NotReadyError`), every
  retry slot for the group shares a module-scoped cache keyed on `fn`:
  slot 0 evaluates and caches `arr` (success) or `err` (still-pending),
  slots `1..N-1` short-circuit on the cached outcome, and the cache
  invalidates when slot 0 re-fires next pass. Net retry cost: 1 evaluation
  per group per pass on either outcome — `N²` → `N` on success, `N²` → `1`
  on failure — with no per-state bookkeeping.

  Bench: `+15%` on `search-results` (heavy attribute usage), neutral on
  `color-picker` (no qualifying groups). Hydration ids are unaffected:
  attribute/textContent expressions never allocate ids, and inserts (which
  do) stay outside groups by construction.

- 3574228: SSR rendering performance pass.

  **Runtime (`dom-expressions`):**
  - Inline hole resolution in `ssr()`. Switch from a `(t, ...nodes)` rest
    parameter to an `arguments` walk, eliminating the per-call holes-array
    allocation. Inline `string`/`number`/`null`/`boolean` fast paths skip
    `tryResolveString` for the typical "all-static-after-eval" hole shape; only
    the heavy path (async escalation) materializes the `{ t, h, p }` result.
  - Single forward-pass `escape()`. The previous implementation walked the
    string twice in the hot path (`indexOf(delim)` + `indexOf("&")` upfront
    then early-exit on the no-hit case). Replaced with a `charCodeAt` loop
    that bails after one pass for clean strings (the common case), and
    resumes the slow path from the first hit so the clean prefix isn't
    re-scanned.
  - Remove the `ssrRunInScope` public export. The function had been a true
    pass-through identity (`fn => fn`) since owner-capture moved into
    `tryResolveString`'s `NotReadyError` handler, and the compiler stopped
    emitting it. With no internal callers and no behavior, the export was
    dead surface area. User code that called it can drop the wrap (it was a
    no-op) or replicate the original deferred-callback owner-capture intent
    in two lines with `getOwner()` + `runWithOwner()`.

  **Compiler (`babel-plugin-jsx-dom-expressions`):**
  - IIFE elision in statement-position JSX. When `<jsx/>` is the argument of
    a `return` or the initializer of a `const` (the overwhelmingly common
    shapes), the surrounding IIFE is removed and the body lifts to flat
    statements before the parent. Saves one closure allocation + one
    function-call frame per render. Applies to `dom`, `ssr`, and `universal`
    emissions; expression-position JSX (ternary branches, array elements,
    function args) keeps the IIFE since lifting would change observable
    evaluation semantics.
  - SSR templates emit hoisted `var` declarations for dynamic-expression temp
    vars instead of wrapping the whole thing in an IIFE. In statement
    position the declarations precede the `ssr(...)` call; in expression
    position they hoist to the enclosing function scope and the
    assignment + call become a comma sequence expression.
  - Drop `ssrRunInScope` emission around dynamic SSR expressions. The
    temp-var hoist stays — it's a V8 IC-stability tactic (keeps the `ssr()`
    call site specialized on `Identifier` argument shapes), not an
    evaluation-order requirement. Ordering is preserved by JS left-to-right
    semantics.
  - Drop `createComponent` wrap on SSR component invocations. The SSR
    runtime's `createComponent` is `Comp(props || {})`; the compiler always
    emits a real `props` object, so the `|| {}` fallback never fires. Inline
    to a direct `Comp(props)` call. DOM / dev modes keep the wrapper since
    it does real work (`untrack`, dev metadata).

  Net effect on representative SSR shapes (color-picker, search-results) is
  fewer allocations per render and a flatter call graph through the hot path.

## 0.50.0-next.6

### Patch Changes

- f0ca033: Add a build-time JSX declaration customization script for renderer packages.

## 0.50.0-next.5

### Patch Changes

- 4f17771: Fix document-root rendering so lazy memo-owned content remains reactive after `render(..., document)` or `hydrate(..., document)`. Full-document render paths now keep the root JSX tree observed without inserting into `document`, preventing nested content from going stale after later signal updates.

## 0.50.0-next.4

### Patch Changes

- a307ac7: Expose `VoidElements` and `RawTextElements` consistently from every
  runtime entry that already re-exports the other HTML constants. The
  runtime added these sets to `client.js` in `0.50.0-next.3`, but
  `server.js` was missed and the hand-maintained `client.d.ts` /
  `server.d.ts` declaration files didn't pick them up either. Now both
  entries (`dom-expressions/client` and `dom-expressions/server`) and
  their type declarations export the same constant surface, so consumers
  like `@solidjs/web` no longer need to layer their own explicit
  re-exports or copy-script workarounds to surface the symbols.

## 0.50.0-next.3

### Patch Changes

- 816870a: Export `VoidElements` and `RawTextElements` from the runtime constants. These are the standard HTML void-element and raw-text-element sets used by HTML parsers, exposed so downstream tagged-template runtimes (e.g. `sld-dom-expressions`) can consume them without redefining the lists.
- 4dae801: Normalize the `repository` field in every package to the standard npm
  convention: a `git+https://github.com/ryansolid/dom-expressions.git` URL
  with a `directory` pointing at the package within the monorepo. Restores
  "View source" / "Open in repo" links on the npm registry and unblocks
  tooling that resolves source from package metadata.

## 0.50.0-next.2

### Patch Changes

- d9b571c: Replace the `memo(accessor, true)` wrap in `insert()` with a conditionally
  nested render-effect pattern. The memo wrap fixed `<Show>` siblings
  re-rendering but introduced two regressions: stale reads broke at the memo
  boundary during transitions, and the memo could claim transition ownership
  and strand later synchronous writes in stashed queues (the Sierpinski hover
  freeze).

  The outer effect now reads `accessor()` with `doNotUnwrap` so function
  children are preserved without subscribing to their internals. When
  function children exist, the outer's compute installs a nested
  render-effect that owns DOM writes for this slot (signalled via an
  `INNER_OWNED` sentinel so the outer's write callback no-ops). Every
  reactive hop on the path is a render-effect with correct stale-value and
  transition-ownership semantics. Same node count as before for
  function-children slots, one fewer for primitive slots.

  Mirrored into `universal.js`.

- 39c207c: Fix a SyntaxError when an element has 222+ merged dynamic attributes
  (solidjs/solid#2682). The internal identifier generator produced `in` at
  index 221, and since these identifiers are emitted as object shorthand
  destructuring bindings, the resulting `({ …, in }) => …` could not be parsed.
  `getNumberedId` now shifts past any natural index that would encode to a JS
  reserved word, keeping the mapping injective and the output at 2 characters
  for all practical dynamic counts.
- 03da8a5: Fix SSR escaping gaps reachable from JSX, and tighten the compiler so
  redundant runtime `escape` calls drop out of the output.

  Security fixes:
  - `ssrStyle` and `ssrClassName` now attribute-escape object keys, not
    just values. Previously a user-controlled key in `<div style={{…}} />`
    or `<div class={{…}} />` could break out of the surrounding attribute.
  - Dynamic fragment-child expressions (`<>{state.text}</>`) now compile
    to `_$memo(() => _$escape(expr))`. Element-child expressions already
    escaped via `escapeExpression`; fragment children reached SSR through
    a separate path and were concatenated raw.
  - Computed-key object styles (`style={{ [k]: v }}`) escape the key at
    compile time.

  Compiler alignment:
  - SSR now matches DOM in rejecting fragments placed directly inside an
    element: `<div><>…</></div>` is a compile error in both renderers.
    Fragments reached via conditionals (`<div>{cond && <>…</>}</div>`)
    remain legal.

  Compiler optimizations:
  - `escapeExpression` drops the outer `_$escape` wrap on a `JSXFragment`
    when its single significant child is either a dynamic expression
    (compiles to a memoized accessor function, `escape(fn)` is a no-op)
    or a native element (compiles to an `_$ssr(…)` SSR node object,
    `escape(object)` is a no-op). This turns
    `cond && _$escape(_$memo(() => _$escape(state.text)))` into
    `cond && _$memo(() => _$escape(state.text))`, and
    `cond && _$escape(_$ssr(_tmpl$N))` into `cond && _$ssr(_tmpl$N)`.

  SSR fixtures for `components`, `conditionalExpressions`, `fragments`,
  and `attributeExpressions` regenerate. Each security fix has a JSX
  round-trip test in `packages/dom-expressions/test/ssr/jsx.spec.jsx`
  that feeds hostile input through `renderToString`.

- 305d9ce: - SSR: Duplicate attributes in JSX without spreads are now deduplicated —
  `<div class="a" class="b" />` correctly renders as `<div class="b" />`
  (last-wins), matching client behavior. Previously the compiler kept both
  attributes in the output.
  - Client: `setAttributeNS` / `removeAttributeNS` now use matching names when
    clearing namespaced attributes (e.g. `xlink:href`). Previously removal could
    leave the attribute in place because it used the local name while the set
    used the qualified name.
  - Expanded test coverage across all four packages; no other behavior changes.

## 0.50.0-next.1

### Patch Changes

- ee365e0: - `insert()` accepts an optional 5th `options` argument that is forwarded to the
  internal `effect()` call, letting callers (e.g. Solid's `render()`) opt into
  transition-aware initial mounts without otherwise changing `insert`'s
  behavior.
  - SSR: `$dflj(ids)` now materializes every id in the list in a single call
    instead of stopping after the first successful `$dfl`. Callers pass only the
    keys they intend to materialize, which simplifies the primitive and composes
    cleanly for bulk-uncollapse cases (e.g. a group activation revealing several
    held fallbacks at once).
  - SSR: Fix cascading async root holes in the streaming shell. When an inner
    Loading boundary resolved its first chunk while the outer shell was still
    pending, `flushEnd` could call `serializer.flush()` before `doShell()` had
    written the root `_assets` module map, causing seroval to silently drop the
    writes and client hydration to fail with "module was not preloaded". Root
    asset serialization is now memoized and gated on both paths.
  - Type formatting cleanup in `jsx-properties.d.ts`.
