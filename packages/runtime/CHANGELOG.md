# dom-expressions

## 0.50.0-next.40

### Patch Changes

- b5df7d3: The server-function handler's commit seam is now the public `commitEventResponse(response, event?)` on the server entry — handler-lifecycle plumbing, the second of a handler's two exits: page results leave through `createSSRResponse`, any other `Response` (a middleware early return, an API result) leaves through `commitEventResponse`; application middleware never calls it. Folds the event's response stub onto the outgoing response with the seam's exact rules — `Set-Cookie` appends entry-by-entry, other stub headers gap-fill only (never the wire-protocol family the handlers own, never `Content-Type`/`Content-Length` on a bodiless response), the status is never taken from the stub — then commits the stub so later writes fail loudly. `event` defaults to the ambient `getRequestEvent()`.

  New relative to the private seam: an already-committed stub passes the response through untouched, making the fold idempotent at handler edges — a handler applies it unconditionally after its middleware chain unwinds, and a page response that already went through `createSSRResponse` does not double-fold its cookies. One implementation, moved to server.js and imported by the server-function handler, so the public API and the handler's own responses cannot drift.

- c02368e: The cookie codec, committed-stub write loudness, and the multi-`Set-Cookie` portability guarantee. Cookies are not core API — core owns the exchange and the codec, nothing ambient: `serializeCookie`/`parseCookieHeader` (dependency-free, percent-encoded round-trip, `Path=/` the only serialize default) are exported as the platform-gap primitives, and the blessed patterns are `parseCookieHeader(event.request.headers.get("cookie"))` for reads and `event.response.headers.append("set-cookie", serializeCookie(name, value, options))` for writes. Both entries export the one real implementation — a pure value transformer has legitimate browser uses (`document.cookie`), so the client entry gets no fake-value stub — while no client-runtime module imports it internally, so it tree-shakes out of bundles that don't call it (guarded in size-guard). Ambient `getCookie`/`setCookie`/`deleteCookie` helpers were briefly added here pre-release and are cut before shipping; ambience belongs to router/framework middleware layered on the codec. Lost writes are never silent, enforced on the stub itself so EVERY writer is covered uniformly: `commitResponseStub(stub)` flips `committed` at each head-freeze moment (`createSSRResponse`'s string result and shell flush, the server-function handler's commit seam) and instruments the stub's `headers` mutating methods (`set`/`append`/`delete`, patched in place — identity and reads untouched) so a post-commit write throws in the dev build and reports + no-ops otherwise; the stream path's documented post-flush `Location` (honored client-side via the completion script) stays permitted. The server-function handler folds the event's response stub onto every outgoing response as the head freezes (encoded results, envelopes, thrown redirects, raw passthroughs, no-JS form redirects) — previously `event.response` writes never reached the wire on that path. Every place response headers materialize or merge (`createSSRResponse`'s head derivation, the handler's envelope/raw forwarding, `respond`/`redirect` inits, the no-JS redirect build, frame-stream responses) carries multiple `Set-Cookie` values entry-by-entry via `getSetCookie()` + append — never `get`/`set` or constructor-copy folding, which corrupts them on runtimes whose `Headers` iteration comma-joins — so multi-cookie responses survive identically across Node/undici, workerd and Deno. The stub gap-fill excludes the protocol-owned header family — the error/format/single-flight tags, `Location`, `X-Revalidate` — which must always reflect the response's own encoding, and skips `Content-Type`/`Content-Length` on bodiless responses (the no-JS redirect deliberately strips them); `Set-Cookie` appending is unaffected. The flash-cookie codec's server half encodes/decodes through the same serializer/parser; the isomorphic regex matcher (`hasFlashCookie`/`matchFlashCookie`) is untouched, keeping the raw-payload contract and the client entry lean.
- fb29c59: Never apply a slot record whose `{$ref}` data args have not arrived yet, and treat a re-sent ref that resolves to an async value as a change. The producer emits a slot chunk BEFORE the `data` chunks carrying its ref'd values, and `#resolveArgs` could not tell "not delivered yet" from a real value — it resolved the miss to `undefined` and handed that to the fill as the arg. On a live occurrence that landed immediately: the update blanked the mounted fill and committed the record, after which nothing re-resolved it (`data` chunks don't re-sync, and the committed record no longer differs), so a render prop taking an async arg went permanently empty from the second response on. Records now wait for their refs; the stream's own html/complete flush re-applies the same record with real args. The second half is what makes the first observable: every promise serializes to `{}`, so the value-compare that lets an equivalent re-sent ref keep its occurrence declared two DIFFERENT pending values equal and the occurrence kept the previous response's value forever. Async values are compared by identity only, so the live occurrence re-suspends on the new one — holding the settled value meanwhile, as the value tier intends.
- c0a44df: Reset the frame's root affinity on `rebind`: the applied-root value and the store's root record are per-stream state, like the version. An address switch can deliver a shell byte-identical to the one on screen (slot-driven content ships its differences as records, not markup); the stale value-skip swallowed the new stream's morph, so `onApply` never fired and a switch gate waiting on it (solid's `isPending` re-arm, solidjs/solid#2977) held forever — the second and every later args switch on a site wedged its source pending with the button-style affordance stuck. Dropping the old root record with it keeps the interim flushes honest: a start chunk or slot write between the rebind and the new stream's html finds no root to re-apply, so the gate can no longer be answered with the previous call's content. Warm re-registrations re-seed their own root record and still answer synchronously.
- fb29c59: Size pass on the frames consumer paying for the slot data-ref fixes (back under the guard ceiling), deduplicating the per-stream store reset — which also fixes rebind never re-arming the once-per-stream error-apply notification, so a switched address's failed stream still releases a first-apply gate
- b5df7d3: `RequestEvent.locals` is now typed by an exported, module-augmentable `RequestEventLocals` interface instead of an inline `Record<string | number | symbol, any>` — the typing seam applications use to declare the state their middleware hangs on the event:

  ```ts
  declare module "@solidjs/web" {
    interface RequestEventLocals {
      user: User;
    }
  }
  ```

  Declared once in server.d.ts and re-exported (not re-declared) by the client entry, so both entries — and the server-functions event, which extends the same `RequestEvent` — share ONE interface identity and a single augmentation reaches every `locals`. The interface keeps the same index signature the inline type had, so un-augmented usage stays exactly as permissive as before: augmentation adds precision for the keys it names without gating existing writes. This replaces Start's ambient `App.RequestEventLocals` namespace pattern — a plain exported interface, no global `App.*`.

- b5df7d3: The serializer entry re-exports seroval's plugin-authoring API: `createPlugin` and `OpaqueReference`, from the runtime's own seroval instance so custom plugins are version-pinned by construction — a plugin built against the author's own `seroval` dependency edge would not fail the build, it would emit nodes the other peer can't interpret, and an `OpaqueReference` from another copy fails seroval's instanceof check and silently serializes as a plain value (solid-start #1474 is the case study). Unlike the rest of the entry, plugin authoring is application-facing: it is the supported way to feed the serializers' `plugins` options and the server-function entries' `codec.plugins`.

  The authoring types (`SerializerPlugin<Value, Info>` — now generic, bare use unchanged — the parse/serialize/deserialize contexts, `PluginData`, `PluginInfo`, and the `createPlugin`/`OpaqueReference` signatures) are declared by hand in serializer.d.ts rather than type-re-exported: seroval's published d.ts use extensionless ESM-relative imports that `moduleResolution: "nodenext"` cannot follow, so a bare re-export silently degrades the whole surface to `any` under skipLibCheck. Deliberately narrower than Start's serialization subpath, which also re-exported seroval's granular context/`Plugin` type names: `createPlugin`'s generics carry full inference, and `SerializerPlugin` remains the one exported plugin type.

## 0.50.0-next.39

### Patch Changes

- 6a405f7: The ambient hydration gather treats frame regions as opaque. The document root's `_hk` sweep collected server-component interiors (everything under a `data-fid` frame element), but the root pass never claims there — fills claim through their own scoped registries on their own schedule, and a fill behind a lazy route module legitimately adopts long after the root completes. Those entries only armed the dev completion sweep to report perfectly-claimed markup as "unclaimed server-rendered node(s)" (visible on any document-face load of a route with a lazy client fill, e.g. the notes editor). Prefix-scoped gathers (a boundary's late resume) are untouched: they name exactly what they own, and keys are namespaced by producer chain, so a nested frame's content can never match a foreign prefix. A hydrate root that IS a frame element still claims its own interior.

## 0.50.0-next.38

### Patch Changes

- 434e3d3: Mark `acquireAsset` `@internal` in the client and server type declarations. Per the head-management RFC's policy, ambient bundler-injected CSS is never lifecycle-managed and the head registry owns the lifecycle of directly-mounted stylesheets outright, so `acquireAsset` is internal machinery for its non-head roles (exclusive slots, owner-following DOM ownership) rather than a public CSS-lifecycle API. It stays exported; only the typedoc surface changes.
- c8fc722: Client-side CSS reveal gating for `useHead` stylesheets (FOUC parity with SSR streaming — docs/client-css-reveal-gating.md). A gateable stylesheet registered during a transition or `Loading` discovery pass now starts fetching at discovery (overlapping the data wait instead of serializing after it) and reads as not-ready until it has loaded or errored, so the reveal holds exactly like the server's `$dfs` gate. Gateability reuses the server's classification: extra attributes must be pure fetch metadata (`crossorigin`, `integrity`, `referrerpolicy`, `fetchpriority`); condition-changing attributes (`media`, `title`, `disabled`) exclude a sheet from gating. Cached and adopted server-emitted sheets acquire synchronously with zero wait, and a registration's replaceable tags (title/meta) never wait on CSS.

  Mechanics: stylesheets warm as inert `rel="preload" as="style"` links and flip to `rel="stylesheet"` at commit (fetch-identity qualifiers ride the preload, so the flip hits the preload cache) — a branch superseded before it commits leaks only an inert preload, never an applied sheet. Warm links inserted while the document is still render-blocked are stamped with the native `blocking="render"` attribute. Errored sheets release the gate (parity with the server gate's `onerror`).

  New surface:
  - `warmAsset(descriptor)` (`@internal`, client): idempotent, refcount-free warm half of `acquireAsset`; returns the registry entry with `loadState: "pending" | "loaded" | "errored"` and `loadPromise` (resolves on load or error, never rejects).
  - Optional `waitAsset(promise)` rxcore seam: throws the core's not-ready error while the promise is unsettled so tracked contexts hold and retry on settle. Cores that don't provide it degrade gracefully — the gate is disabled, warm-at-discovery still works.

- 4003774: The document face gets the value tier's inline half (DR-2, t=0 — where the server is the consumer). An async value passed whole as a slot arg used to reach the inline fill RAW during document SSR: nothing suspended, the t=0 markup shipped an empty hole where the settled value belongs, and the adopted client — which settles correctly from the record — contradicted the page bytes (a hydration mismatch instead of a covered pending read). The document slot props now wrap async-valued args so the fill's read suspends: the read throws not-ready through rxcore's new `ssrAsyncValue` into the engine's hole machinery, the covering boundary holds, and the re-pull delivers the settled value in markup — finer than the not-ready thunk case's whole-section defer, since the throw happens in the fill's own hole. The record is untouched: the async value itself still ships there, its resolution streaming through the document's data scripts.

  Async iterables have one cursor and two consumers, so they tap: the inline read settles on the FIRST yield (markup is the V1 snapshot; later yields belong to the adopted client) and the record ships a replay wrapper that re-yields it before delegating, so the client still receives the complete sequence.

  Cores without `ssrAsyncValue` fall back to the previous raw-value behavior.

- 5de9e48: An `:error` record now fires the frame's `onApply` hook (reason `"error"`, once per stream; a new version re-arms). A consumer gating on first apply — a mount holding its covering loading boundary open until the frame has content — releases on a failed stream instead of holding the fallback forever.
- 04532ad: `useHead`: suspend on pending props during a Loading discovery pass instead
  of dropping the tag (solid #2975).

  Head props are lazy descriptors that nothing reads during render, so an
  async value (`<title>{data()}</title>`) never suspended its enclosing
  boundary — the pending read surfaced only at flush, where the tag was
  warn-dropped and the fallback never showed. Registration now probes the
  descriptor's prop/key getters when the reactive library marks a Loading
  discovery pass (`_loadingPhase` on the hydration context — the only render
  phase with a retryable NotReady catch) and rethrows a NotReady so the
  boundary suspends like any other async content; the retry re-registers with
  ready values and the resolved tag rides the boundary's stream as a head
  patch. The probe's result is discarded — flush evaluation stays
  authoritative — and registrations outside a Loading pass keep the
  flush-time warn-and-drop path (rethrowing there has no retryable catch and
  would loop a wider re-rendering scope). Pending resource-tag props under a
  Loading pass suspend the same way; identity dedupe absorbs the retry's
  re-emission.

- 42a04a5: useHead: root-level pending head props hold the streaming shell instead of warn-dropping. A pending prop read outside a Loading pass now registers the source with the shell's blocking set (the implicit-blocker semantics root-level async content and effects already have), and the post-settle flush commits the tag. Boundary-attributed tags keep flushing with their fragment, renderToString keeps warn-and-drop, and real errors stay on the existing handling path. Requires rxcore's `ssrHandleError` to support a side-effect-free probe mode (second argument).
- 5e79412: RC API-freeze pass over the server/web surface. `renderToStringAsync` is removed — `renderToStream` is a proper thenable now (`then(onFulfilled, onRejected)` returns a real `Promise`), so the fully-settled-string form of a render is `const html = await renderToStream(code, options)`; render errors still route through `onError` and the promise resolves with whatever HTML the render produced (it never rejects). The rich-arguments hint thrown for non-JSON-serializable arguments now names the shipped entry (`@solidjs/web/server-functions/rich-args`), and the server-function client entry re-exports `serializeString` so bundled rich-args entries resolve their codec against the shared client instance. Surface markings for the freeze: the serializer module carries an integration-facing banner and per-export "may change" notes (it is exempt from the 2.0 stability guarantee); compiler-output-only primitives, hydration walkers, event-delegation plumbing, and element-claim plumbing on the client entry are `@internal`; the server-function wire plumbing (`ChunkReader`, `createChunk`, `frameAddress`, `decodeResponsePayload`, `encode`/`decodeErrorHeaderValue`, `getServerFunctionsCodec`) is `@internal`; and every frames export (`frame-client`, `frame-transport`, `frame-sink`) is tagged `@experimental` with a per-file banner — the frames/server-components preview is excluded from the RC stability guarantee.
- 61f9721: Remove `useAssets`, `Assets`, and `getAssets`, completing the head-management
  RFC's replacement plan. `useHead` is the head-injection surface (structured
  tags, streaming, dedupe, hydration adoption — everything the raw-HTML path
  lacked), and `getAssets`'s embedded-render role is served by the `onHead`
  render option, which is closure-bound to its render instead of reading
  ambient state. The `context.assets` evaluation pipeline they fed (shell-time
  closure evaluation, the `assets` argument through document assembly and the
  sink shell meta) is deleted with them; tracked asset links, inline-style
  registration, and hydration script placement are unaffected.
- 41381d2: HTTP response-head lifecycle and middleware composition for SSR handlers, plus a per-invocation wrap seam for server functions.
  - `createRequestEvent(request, init?)` builds the canonical stub-backed request event (`request`, `locals`, a `ResponseStub` `response` the render's primitives write to).
  - `createSSRResponse(result, event, options?)` derives the outgoing `Response` from a render result, freezing the head at shell flush: the stub commits there, a pre-flush `Location` becomes a real redirect (`getExpectedRedirectStatus`, also exported), and a post-flush `Location` appends a nonce-aware `<script>window.location=...</script>` fallback before the stream closes. `options.transformChunk` rewrites outgoing chunks.
  - `composeMiddleware(middlewares)` composes fetch-style `(request, next) => Response` middleware; runs inside the caller's request scope so `getRequestEvent()` works as in application code, and nothing reaches the wire until the outermost middleware returns.
  - `configureServerFunctionsServer({ wrapInvocation })` / `handleServerFunctionRequest(..., { wrapInvocation })`: wraps every server function execution (HTTP dispatch and direct SSR calls) with the invocation identity established — the seam for per-function middleware, auth, logging and error mapping.

- 4e769fd: Sanitize plain thrown server-function errors by default in production. A server function that threw a plain `Error` (not a `Response`/envelope) previously serialized its `message` and every own-property to the client verbatim over the wire protocol — a driver/ORM error's failing query, connection string, or bound parameters included — identically in dev and prod. `handleServerFunctionRequest` now replaces a plain thrown value with a generic `Error` outside the dev build; dev keeps full fidelity (message, stack, own-props) for DX. The client still receives an `Error` (the shape `submission.error` expects), just with no leaked content. The dev/prod line is the BUILD VARIANT, not `NODE_ENV`: the gate reads the bundler-replaced `_DX_DEV_` flag through a strict comparison (`"_DX_DEV_" === true`), so a bundler that replaces the flag selects the mode (`@solidjs/web` publishes a dev copy of its server-functions server entry behind the `development` export condition), and raw, unreplaced source — deep imports, no build signal — fails safe and sanitizes. The handler's dev-only diagnostic bodies (unknown function, method not allowed, no-JS 500 message) ride the same flag. An `@internal` `setServerFunctionsDev(dev)` seam exists for test harnesses and hand-rolled bundles whose packaging cannot replace the flag. Intentional error content still flows: thrown `Response`/envelopes (`redirect`/`reload`/`respond`) are untouched, and a new `markSafeError(error)` escape hatch (registered-symbol brand `Symbol.for("solid.SafeError")`, non-enumerable so it never rides the wire) opts a value out of sanitization. `wrapInvocation`/`transformResult` overrides that map errors express intent the same way — throw a Response/envelope or brand the mapped error safe — so a framework onError policy keeps working but must brand its result to preserve a custom client-facing message in production.
- 0f41c61: Watched slot args (DR-2 case 1): expression bindings are live for the response window. The frame sink now keeps a binding ledger — every re-runnable slot arg that classifies as data (a compiled getter, the common `<props.slot thing={thing()} />` form; an author thunk; a memo passed whole) opens a binding after its record emits. Every commit the response observes (a data flush, a fragment resolving, a pending arg's retry settling, or the reactive core's `ctx.commit` poke for settles a server-owned render never serializes) schedules one coalesced, reference-equality-gated sweep; changed values re-emit the occurrence's record over the existing live-props wire — changed scalars inline, changed objects under write-once versioned refs (`arg:<occ>:<key>@<n>`), settled→not-ready re-entering pending-with-previous through the retry loop. Sweep-minted refs are excluded from the commit funnel, so a getter returning fresh identities re-emits at most once per real commit instead of looping. `end()` runs a final synchronous sweep so a last-flush commit ships before `complete`, and the sink exposes a commit epoch (`ctx.commitEpoch`) the reactive core uses for per-epoch memo caching. Eagerly evaluated call-expression args stay write-once — JS evaluated them before the border.

  The ledger is keyed by `(occurrence, arg)` with replace-on-reopen: a re-render of the same occurrence within one response — the same `$key` rendered twice today; a generator component's next yield once that proposal lands — supersedes the previous render's bindings instead of leaving both sweeping (which double-emitted per commit). Versioned-ref allocation is sink-owned per position, so a superseding binding continues its position's ref sequence rather than colliding with write-once keys.

  Also fixes a latent crash the ledger work surfaced: a not-ready COMPILED GETTER arg (evaluation throws at the property read itself, unlike a thunk) was re-read inside the classifier's catch, threw out of it, and killed the stream with an error chunk. Evaluators are now captured from the property descriptor, so getter args take the same ship-pending-and-retry path thunks always did.

## 0.50.0-next.37

### Patch Changes

- f26d0fa: Restore a stream's render context before re-pulling pending root holes. An async root hole can resume after another render has replaced `sharedConfig.context` (module-global, shared across interleaved renders); re-pulling the hole first rendered the markup but silently dropped hydration records emitted during the retry — they serialized into the other render's completed context instead of the response that owns the resumed markup. (From #561.)
- a297f34: Serialized server-component references self-bootstrap the `_$SC` registry. The registry previously had to be installed by the document shell ahead of every data script, and the integration doing that (vite-plugin-solid) spliced it directly after `<head>` — where the hydration walk claims it as the first walked child and drifts every positional claim in the head by one (metas claimed as title, title as link), silently in production where the dev structure warnings don't exist. Now the FIRST reference each hydration script serializes carries the registry as an idempotent expression (`(self._$SC||(self._$SC={...}))`), so ordering is correct by construction — every script that reads the registry contains or follows its definition — and nothing sits ahead of the authored head elements. Demand-driven: documents that never serialize a server component ship nothing. The bootstrap text and first-use tracking live in the server-only document-SSR module (installed into the shared transport at load), so client bundles don't grow; `SERVER_COMPONENT_BOOTSTRAP` stays exported (now idempotent, first definition wins) for integrations still installing it document-wide.

## 0.50.0-next.36

### Minor Changes

- 139f21c: Server components Stage 2 (identity split + one record shape, per docs/server-components-principles.md):
  - **A5 — one record shape.** The t=0 document emits the same slot/region records a stream would: every invoked occurrence gets a record, and every region arg rides as its `{$frame}` address ref (used or occluded). The consumer's region-threading patches and the #547 `$frame`-addition leniency delete with the skew.
  - **Resident-store host.** The frame host owns per-id stores as first-class residents: chunk writes land whether or not anything is mounted, and registering frames seed from the store. The unregistered-chunk buffer, retention snapshots, and sibling seeding all delete into that one shape; preloads warm stores by construction.
  - **DR-1 — the identity split.** `createServerComponentHandler` mints ONE mount component per server function and resolves calls with per-address **bindings** (`COMPONENT_BINDING: { component, address }`, the address delivered as a second-argument accessor). An equals-gated reader keeps its instance across argument changes and delivers the new address; the instance re-binds its frame's pull to the new address's store. The `COMPONENT_HANDOFF` protocol, `forwards` map, `documentComponent` seam, and the flight `route` map are deleted.
  - Region discovery membership is structural (dotted id inside this interior) instead of producer-prefix-matched, so address-keyed mounts adopt function-id-prefixed markup.
  - Guards against a recycled occurrence name's up-threaded record removal deleting a newer stream's live record.

  Net −402 B on the frames consumer bundle (8,610 → 8,208 min+gzip); size guard ratcheted to 8,228.

### Patch Changes

- 6e1f2d8: Treat a throwing stream sink or a cancelled readable as client disconnect. A `pipe` sink whose `write`/`end` throws (e.g. a web-stream adapter enqueueing after close) previously let the throw escape from deferred write machinery (`writeTasks`, late fragment flushes run from the microtask queue) as an unhandled error that could take the host process down. Sink invocations are now guarded: a throw stops all further sink calls, marks the render completed so pending fragment resolutions stop emitting and serializing, and disposes in-flight reactive work. `pipeTo` write rejections and a rejected writer `closed` (which is how cancelling `renderToStream(...).readable` surfaces) trigger the same teardown and settle the `pipeTo` promise, so an aborted request winds the render down instead of computing fragments for a dead stream.
- 1b63135: Defer adopt-time classification of a recordless slot occurrence while document records may still arrive (solidjs/solid#2968). An invoked occurrence's args record rides the document as a data script, and nothing on the wire formally orders that script before the event that triggers adoption; when adoption won the race the occurrence resolved no record, classification fell through to "direct content", and the wrapper's render-prop callback was evaluated as a zero-argument accessor — a callback reading `props.x` halted the reactive system. Adopt frames now accept a `recordsPending`/`drainRecords` seam from the document integration: a recordless occurrence defers one macrotask (all currently parsed scripts run first), records are re-drained, and classification happens with the record present. Server-rendered DOM stays in place across the deferral. Interim by design — the unified record shape (principles doc A5, stage 2) removes the timing skew and this machinery with it.
- 944f08e: Defer a recordless adopted occurrence while document records may still arrive, not one macrotask. A streamed document held open on async content (or slow dev-mode module timing) delivers records across many macrotasks; the previous one-shot defer classified the tail of them as direct content, evaluating render-prop callbacks as zero-arg accessors. The re-check now re-arms until `recordsPending` flips false — the same settlement contract the fragment ledger guarantees — and the wait is invisible on screen because an adopted occurrence's server-rendered interior is already in the DOM. (From #559; its remount seed-merge half is superseded by the identity split's resident stores, now pinned by a regression test.)
- e7ddc12: Record streamed-fragment reveals in the hydration ledger: `$dfr` marks
  `_$HY.v[id]` when it swaps content in, so the runtime can answer "which
  declared fragments are still outstanding" from records — across the
  pre-boot window — instead of scanning the document for `pl-*` templates.
  Recording only; reveal policy stays with the hydration runtime's `_$HY.f`.
- f875aa8: Head management: reactive group membership and identity refinements for `useHead`.
  - `useHead` now accepts `() => HeadTag | HeadTag[]` — a reactive group whose
    membership is re-read on change (client) or resolved at the owning
    boundary's flush (server). This is the primitive component-level grouping
    (Solid Meta's `<Head>`) builds on: a group can compose its tag list after
    registration. Membership changes keep the registration's original commit
    position. Resource tags inside a function-form group emit at their
    boundary's flush rather than eagerly.
  - `media` now qualifies replaceable meta identity: metas sharing a
    `name`/`property`/`http-equiv` but differing by media query (e.g.
    `theme-color` light/dark) coexist instead of colliding last-wins.
  - `link[rel=icon]` and `link[rel=apple-touch-icon]` are now replaceable
    instead of resource-class, with identity `rel + sizes + type` — deliberately
    excluding `href`, so a swapped icon (per-route favicons, notification
    badges) replaces its predecessor and disposal restores the previous one,
    while size/type variants coexist as separate identities.

- 7953cdc: Identity-first morph (server-components principles DR-5): the reconcile
  records each wholesale-inserted subtree root as a graft site, and one
  post-reconcile walk swaps bare slot marker pairs inside those subtrees for
  the occurrence's live client-owned range from the frame-wide index —
  interior, and the client state mounted in it, intact. Replaces the
  end-of-morph `restoreDisplacedRanges` repair pass, which rescanned the whole
  frame with `collectSlots` after every apply that left displaced entries.
  Recording at insertion makes "a live range was detached because its parent
  didn't match" unreachable by construction: every place a range could be owed
  is on the list, at O(inserted) instead of O(frame). Range placement (stashed
  fragment vs attached start marker) is unified in a single `placeRange`
  helper shared by the reconcile's marker branch and the graft walk.
- f61a07c: Move undefined into ref type

## 0.50.0-next.35

### Patch Changes

- c4edd61: Fix cached server-component frame handoffs so nested document boundaries are not adopted as parent regions, and every live sibling is seeded from rebased retained state during cache-only rebinds.
- a0674d4: Streamed fragments that settle after hydration completes are held for their claimant instead of discarded: `$df` now consults a claimant flag (`_$HY.fk`) when `_$HY.done` is set, and parks unclaimed swaps in a hold queue (`_$HY.hq`) that a late-registering boundary replays. Fixes server-component boundaries that resolve after the shell flush never mounting (solidjs/solid#2964).
- 4b125e3: Restore displaced slot ranges into wholesale-inserted parents at end of morph. The frame-wide displaced-range index only applied where the reconcile descended into a matched parent; a new parent with no old counterpart is inserted wholesale from the parsed source, carrying bare marker pairs, so a live range for the same occurrence stayed orphaned in the index while the occurrence remained "mounted" over detached nodes — the slot rendered empty and no later sync could recover it (the record dedupe sees an already-mounted occurrence). An end-of-morph sweep now swaps each remaining indexed range into its bare marker pair in the final content. Fixes the notes-demo search shape: filtering a server-rendered list down and back up (typing then clearing a search) left the regrown rows blank.
- 96a04d3: Add a call-site handoff to server component boundaries so a live mount survives argument changes

  Per-args boundary identity resolves each `(function, arguments)` call to its own component, which made a live call site switching arguments (a search box filtering a server-rendered list) swap boundaries and destroy client slot state. Components minted by `createServerComponentHandler` are now branded with a `COMPONENT_HANDOFF` contract: when a reader offers its previous value and the incoming component is the same function under new arguments, `take()` rebinds the mounted frame to the new call — the element and its keyed slot ranges stay while the new call's stream morphs in place. Frames gained `rebind`/`rebase` for this, slot regions are keyed by argument name so wire renames follow without re-calling occurrences, and preloads — which have no reader — never take a mount, preserving isolation.

- 779488f: Add live slot props to frames: a binding can register `ctx.onUpdate(fn)` during its invocation to receive re-resolved props when a re-sent slot record's args change in value, instead of the occurrence being re-called. The invocation's instance, client state, and DOM identity survive the change; cached `{$frame}` regions are reused/renamed through the existing machinery. Unregistered consumers keep the re-call behavior.
- 1f601f6: Split streamed-fragment reveals into inline mechanics and runtime policy. The stream's inline script keeps only the parse-time swap mechanics (`$dfr`, so streaming still reveals with no JS at all); `$df` now routes through `_$HY.f` when the hydration runtime has installed it — the same one-owner handoff the head-patch runtime uses via `_$HY.h`. The `_$HY.fk`/`_$HY.hq` claimant flag tables and the inline `_$HY.done` policy branch are deleted: late-arrival holds and boundary claims are decided in one place (the runtime), which owns them by construction instead of negotiating through globals.
- d27884c: Add `useHead`, a streaming-correct head-management primitive (stage 1 of the
  head management RFC, `docs/head-management-rfc.md`).

  ```ts
  type HeadTag = {
    tag: "title" | "meta" | "link" | "style" | "script" | "base";
    props: Record<string, any>; // values may be getters (lazy on the server, reactive on the client)
    key?: string | (() => string); // explicit identity override
  };
  function useHead(tag: HeadTag | HeadTag[]): void;
  ```

  - An array is a group — one replacement set; a single tag is a group of one.
  - Replaceable tags (title, meta, canonical links, inline style/script bodies)
    resolve by last-committed group per identity. On the server they render into
    `<head>` at shell flush and stream as patch ops that apply atomically with
    their suspense boundary's reveal (riding the `$df` activation, including
    style gates). Props getters evaluate exactly once, at the owning boundary's
    flush — the migration path for deferred CSS collectors.
  - Resource tags (`link rel=preload/preconnect/…`, stylesheets, `script[src]`)
    emit eagerly with identity dedupe (URL + qualifying attributes), sharing one
    identity set with manifest-driven asset tracking. Stylesheets whose extra
    attributes are pure fetch metadata (`crossorigin`, `integrity`,
    `referrerpolicy`, `fetchpriority`) — and query-stringed dev-server CSS URLs
    — gate their suspense boundary's reveal like tracked boundary CSS;
    condition-changing attributes (`media`, alternate, `disabled`) emit ungated.
    On the client, stylesheets ride the ref-counted asset registry (removal
    follows the owner); hints are never retracted.
  - `title` is a hard singleton with stack semantics: disposal restores the
    previous winner, then the static shell title.
  - `meta[charset]` and `base` splice into a head prelude immediately after the
    `<head>` open tag and are shell-only.
  - Client registrations are reactive, keep their commit position across
    updates, and own their DOM via `data-dh` markers — static head content and
    third-party tags are never clobbered. Hydration claims server-rendered
    winners in place; streamed patches route through the registry once it is
    live, so head state never flickers regardless of chunk/bundle timing.

  Embedded renders (host-owned documents) get a first-class contract: the new
  `onHead(head: string)` option on `renderToString`/`renderToStream`. When the
  render output contains no `</head>`, everything head-bound (resolved `useHead`
  winners, eager resources, tracked asset links, inline styles) is delivered to
  the callback — prelude first — for the host to splice into its own template,
  instead of being silently dropped. For streams it fires before the first chunk;
  post-shell head updates ride the stream and apply in the browser. Unlike
  `getAssets()`, it is closure-bound to its render, so concurrent renders cannot
  leak head content across requests.

  `useAssets`, `getAssets`, and `Assets` are now deprecated and will be removed
  before `0.50.0` stable; migrate head injection to `useHead` and embedded head
  extraction to `onHead`.

## 0.50.0-next.34

### Patch Changes

- 2885c4f: Frame morphs now relocate keyed slot ranges across parents. Occurrence ids are unique within a frame's content, but range preservation was sibling-scoped: deleting an item from a keyed list shifted every range below it into a different parent element, where the morph saw only "new id here", adopted the incoming empty marker pair, and destroyed the live interior — which the slot-record dedupe then never re-invoked (surviving list items rendered blank). The morph indexes the frame's slot ranges frame-wide before reconciling and moves a displaced range — interior intact — into its new position; ranges whose old parent reconciles first are stashed whole instead of removed node-by-node. This also lifts the documented limitation that a server element wrapping each keyed occurrence defeated reorder identity.
- 2885c4f: Server-component boundary identity is now the call's intrinsic `(function, arguments)` address end to end — the same per-args rule an integration's query cache keys values by, so cached components and boundaries stay one-to-one. A repeat call for the same args resolves the identical component (refetches morph the showing boundary in place, cache hits pass the reader's equals-gate); different args resolve a different boundary, so a hover preload for other arguments streams off-screen (buffered until mounted) instead of morphing what the page is showing, and a call site switching arguments swaps boundaries rather than carrying one boundary's client state across calls. This replaces the context-capture (`capture`) keying, whose one-boundary-per-site model let a fresh cache hit for one args-variant resolve a component already mounted showing another — the equals-gate held and the page silently kept the wrong content.

  The frame host now retains an unmounted boundary's store (element boundaries whose markup arrived as document HTML snapshot their interior at unregister), and a remount seeds from it: a cache hit that resolves with no new stream re-materializes the boundary instantly instead of rendering blank, and a stale-cache refetch morphs over the re-materialized state. This fixes intermittently blank pages when navigating back and forth between two views inside the cache freshness window.

- 7bb60aa: Spread parity for nullish input values (#2957): `value`/`defaultValue` on input/textarea assigned through `spread()` now normalize `undefined`/`null` to an empty string, matching the compiled direct-binding output (`el.value = v ?? ""`) instead of stringifying to "undefined".
- 2885c4f: Client size pass on the frames runtime: the frame client's slot-range and placeholder discovery walk through shared bounded sibling walkers, dead range helpers are gone, and the server-function client entry re-exports the wire-layer framing/addressing utilities (`ChunkReader`, `createChunk`, `deserializeStream`, `frameAddress`, `REVALIDATE_HEADER`) so an integration's transport bundle can resolve them from the shared built instance instead of carrying a private copy.
- 2885c4f: Frame sink runs the server component's own render inside the core's context barrier (`runInServerComponentScope`, when the core provides one) at both render entries — document-mode inline rendering (`frameTransformDirectResult`) and standalone streams (`renderServerComponent`). User context never crosses a server-component root, so t=0 inline renders agree with standalone refetches by construction. Slot props are created outside the barrier so client positions re-enter the caller's zone with full app context. Cores without the export fall back to plain evaluation.
- 2885c4f: Single-flight mutations with server-component regions: when part of what a mutation invalidates is markup, the frame stream carries the whole payload in one round trip.
  - `frameTransformFlightResult` (install as `transformFlightResult` on the server-function handler): a component-valued flight-data entry stays in the `{ value, data }` envelope like any other value — serialized as a flight reference — while its content rides the same response as a region addressed by the call (`frameAddress(id, args)`, the one name both peers derive independently). Markup ships as html exactly once; the envelope carries a pointer to it. With no markup in the payload the response stays the plain single-flight envelope, byte for byte.
  - `createServerComponentHandler` consumes it: regions route to the boundaries showing the calls they refresh (including boundaries answered locally at t=0 through `intercept`, which now records its address), per-frame versions rotate response-scoped state, and the envelope decodes progressively from `outcome` chunks — the caller gets the mutation's value, the flight consumer gets the data, exactly like a data-only response. A region nothing is showing buffers in the host and a boundary is minted for it on reference resolution, so the content mounts wherever the seeded value is eventually read.
  - `ServerComponentPlugin` moved to `frame-transport.js` (re-exported from `frame-sink.js`) so client bundles can carry it; its JSON-codec `deserialize` resolves flight references through the live transport registry by call address, returning the very component the reading call site already holds — seeding an integration cache with it never fails an equals-gate. Document (eval-style) references stay per-function-id, t=0 adoption untouched. The protocol injects the plugin itself on both legs (`flightCodec`) — nothing to register.
  - `createServerComponentHandler` accepts `consumer`/`codec` getters for bundlers that give the transport a private module copy (the flight consumer and codec are module state in the server-function client's shared instance); `getFlightDataConsumer`/`getServerFunctionsCodec` are re-exported from the client entry for the same reason.
  - `frameAddress` argument hashing is realm-stable for `Date`/`Map`/`Set` (the client and the server's collection pass hash independently; `String(value)` for these is implementation-defined and a diverging digest silently degrades single-flight to a refetch).

- d1d31ae: `renderToStream(...).pipeTo(w)` now awaits in-flight writes before releasing the writer and closing. `buffer.write` issued `writer.write()` without awaiting the returned promise, and `writable.end()` then called `writer.releaseLock()` synchronously, so whether a chunk still in flight survived was left to the host's stream implementation — Node queues it anyway, workerd drops it. The chunk at risk is always the last one written, which for a streamed `<Loading>` boundary is its `<id>_fr` resolution script. Losing that leaves the client's boundary waiting on a promise that never resolves: it renders its fallback into detached DOM, the server's streamed content is never claimed, and every binding inside the boundary is dead after hydration — including plain signals with no async involvement, and with no error anywhere.
- 86ed7fc: Rename `getServerFunctionMeta` → `getServerFunctionInvocation` (and its `ServerFunctionMeta` result type → `ServerFunctionInvocation`), resolving the near-collision with `getServerFunctionMetadata(fn)`: the latter reads a reference's static declaration metadata, while this accessor returns info about the call in flight (today `{ id }`). The invocation state also moves out of `event.locals` (user/integration space — and derived events share locals with their outer event, so nested or concurrent calls leaked and overwrote each other's state) into a module-private WeakMap keyed by the per-call request event; no `serverFunctionMeta`/`serverFunctionInvocation` key ever appears in locals. The server-functions client entry gains a no-op `getServerFunctionInvocation` (always `undefined`) and the `ServerFunctionInvocation` type, so `"use server"` modules importing the accessor stay type- and import-stable in client builds before dead-code elimination. No back-compat alias — beta line, clean rename.
- 2bbd46d: Export `ResponseStub` — the named shape of the mutable `{ status, statusText, headers }` response head integrations expose as `event.response` via module augmentation (as `@solidjs/router` does; core deliberately does not declare the property on `RequestEvent` itself so augmentations stay conflict-free, but its server-function handler already reads the head's `Set-Cookie` headers when folding single-flight cookies). The stub carries a `committed?: boolean` flag, set by the integration once the response head has been derived/sent from it — consumers that write response metadata during render (e.g. JSX response components) must treat later status/header writes and cleanup-time retractions as no-ops. It is a placeholder the real `Response` is derived from, which is why the head commits while the body may still be streaming. Types + docs only — no runtime behavior change.
- 716ff3a: Add a lazy, cached `readable` getter to the `renderToStream` result — a `ReadableStream<Uint8Array>` view of the render for web-standard responses: `new Response(renderToStream(fn).readable)`. First access creates an internal `TransformStream` and starts piping into its writable side (deliberately not awaited — the pipe settles only after the whole render is written, and nothing drains the readable until it is handed back); the readable side is cached so repeated access returns the same stream. Chunks are UTF-8 encoded bytes, exactly what `pipeTo` writes. Like `pipe`/`pipeTo`, accessing `readable` consumes the render — the result tracks which consumer claimed it, and mixing distinct consumers (`readable` then `pipe`/`pipeTo`, or the reverse) throws a deterministic error naming the conflict.
- 467279f: `transformResult` (both the server-wide config and the per-request handler option) now receives the call's identity on its context: the function `id` and the parsed `args` the implementation was invoked with, on returned and thrown results alike. This matches the context `transformDirectResult` already receives for in-process SSR calls, so a result policy that keys state by the call — deriving a wire address, capturing a prerender artifact — works uniformly over either dispatch path. Type declarations for both transforms were updated to match (`transformDirectResult`'s previously understated its context, which also carries `args` and `event`).
- faa19ac: Type the `transformFlightResult` seam. The single-flight fold policy hook was accepted by `configureServerFunctionsServer` and honored as a per-handler override, but never declared in `server.d.ts` — integrations wiring it (the frames policy's `frameTransformFlightResult`) only worked through untyped generated code. Both option surfaces now declare it, with the handler JSDoc updated to match.

## 0.50.0-next.33

### Patch Changes

- b3c64b8: Pre-digest the single-flight outcome so `collectFlightData` hooks only supply the data strategy. The handler now computes the generic halves of collection before invoking the hook and hands them over on the outcome: `targetUrl` (the URL the client will show after the mutation — the redirect `Location` resolved against the request URL, or the referring page; undefined without a usable referer or for off-origin redirects), `revalidateKeys` (the outcome's `X-Revalidate` keys, split), and `foldedHeaders` (the request headers with the event's and the outcome's `Set-Cookie` effects applied, later winning). Raw body-carrying `Response` values no longer invoke the hook at all — they are the caller's verbatim payload, with no envelope to fold data into. Existing hooks keep working unchanged; the new fields are additive.

  Adds `decodeResponsePayload` beside `decodeResponse`: decodes a transport response and splits the single-flight envelope into `{ value, flightData }`, so integrations handling manually opted-in calls stop reimplementing the payload shape.

- 675c5c7: Warn loudly on the server when the asset manifest returns no client assets for a requested module. When `context.resolveAssets` answers null/undefined or with no js entries for a module the render asked about, server-side `lazy()` cannot file the module's hydration asset map entry, the client is unable to preload it, and hydration fails with a cryptic `lazy() module "…" was not preloaded before hydration` error far from the actual cause (an environmental manifest miss, e.g. a dev-manifest bridge that failed to answer). The resolution seam now emits a `console.error` naming the module key and what to check, deduped per module per render. `noScripts` renders (which ship no hydration data) and the `resolveAssetsSync` probe path (which has graceful fallbacks) are excluded.

## 0.50.0-next.32

### Patch Changes

- e445c8c: Make `applyRef` generic so callbacks typed for a concrete element (e.g. `HTMLInputElement`) type-check when forwarding `props.ref`.
- f356047: Frames: make document-boot absorption linear instead of quadratic

  Three costs in the frame client scaled superlinearly with content size on an adopted document boot (measured on a 1,365-comment page, ~4x CPU throttle):
  - The host's pending-chunk buffer rescanned the whole buffer per chunk (`reduce` for the max version plus a `filter` copy). Every t=0 slot record funnels through it before the boundary binds, so buffering N records was O(N²) — ~1.9M closure calls on the test page. The buffer now tracks its version explicitly and each chunk is O(1).
  - The adopt constructor ran a second full `#syncSlots` walk even when the registration flush had already synced (every apply ends in `#flush` → `#syncSlots`). It now only syncs when no buffered chunk arrived.
  - `#syncSlots` re-ran `#discoverRegions` after an invoke that claimed the adopted DOM in place, where the pre-invoke discovery had already seen the untouched interior. The rescan now only runs when the callback actually rendered.

  Together with the claim-registry fix in `@solidjs/web/frames`, this cut the frames demo's absorption JS roughly in half and its Lighthouse Total Blocking Time from 140ms to 66ms.

- e71f02c: Hoist the router-agnostic wire protocols out of Solid Router into the server function runtime — the pieces both peers of the transport must agree on, none of which contained a routing decision:
  - `REVALIDATE_HEADER` (`response.js`): the `X-Revalidate` header finally gets a named export next to the helpers that write it (`redirect`/`reload`/`respond`'s `revalidate` option). The client transport's control-flow checks now read the constant instead of spelling the literal; integrations should too. Key semantics are unchanged: opaque strings core never inspects — how they are matched (prefixes, exact names) stays the integration's business.
  - Flash cookie (`shared.js` + `flash.js`): the no-JS form convention's cookie, previously private to Solid Router. A form posted without the client runtime has no channel to receive a value, so the handler redirects back with the outcome riding a one-shot `flash` cookie for the next render to pick up. The split follows bundle reality: the name, detection (`hasFlashCookie`) and one-shot clearing (`clearFlashCookie`) are isomorphic in `shared.js` — integrations consume the cookie eagerly from code that also ships to the browser, where the clear must be queued before streaming flushes the response headers — while the codec (`encodeFlashCookie`/`decodeFlashCookie`, the `FlashSubmission` shape) is server-only behind the server entry. The payload stays plain JSON with `$f`/`$u` markers reviving `FormData`/`URLSearchParams` (files dropped): it has to survive a 4 KB cookie, and both halves are synchronous while the wire codec is not.
  - `foldSetCookies(headers, setCookies)` (`server.js`): request headers with `Set-Cookie` deltas folded into the `Cookie` header, as the browser would have applied them before its next request — later entries win, `Max-Age <= 0` and past `Expires` delete. Work re-run on the server after a mutation (single-flight collection) starts from the request that triggered it, whose cookies are pre-mutation by definition; which responses contribute is the caller's decision.
  - `createNoJSHandler({ base })` (`server.js`): the redirect-back-with-flash-cookie policy itself, also hoisted — it reads the `Referer`, picks `303 See Other` for the POST→GET turn (honoring a result Response's own redirect status and `Location`), and flashes non-Response outcomes; a result that is already a `Response` carries its meaning in its metadata and is not flashed. Reading the cookie into UI state on the next render remains the integration's half.

  `handleServerFunctionRequest` now applies `createNoJSHandler()` by default to browser form posts — POST with a form content type and no `BODY_FORMAT_HEADER`, which only the client runtime sends — so an unconfigured app gets working progressive enhancement instead of answering a real `<form>` post with a serialized payload. Direct HTTP callers keep the plain response. The resolution chain is per-request `handleNoJS`, then the new `configureServerFunctionsServer({ handleNoJS })` (register `createNoJSHandler({ base })` there to set a mount path or to extend the convention to every instanceless call), then the built-in form-post default; `null` at either level disables the convention entirely.

  Also fixes the thrown leg of the no-JS path: a thrown bodyless `Response` (the common `throw redirect(...)`) was nulled for body encoding before `handleNoJS` ever saw it, silently losing the redirect target and turning it into a 303 back to the referrer. The handler now receives the original Response, matching what the returned path always passed — covered by an end-to-end dispatch test, which the previous unit-only coverage never exercised.

- ac6e809: Pass the revealed fragment's parent to the `_$HY.fe` reveal hook: `$df` now calls `_$HY.fe(id, parent)`. The hook already fired on every swap but carried only the fragment id, so a consumer that needs to look at what just landed — server-component boundaries adopt their element there — had no choice but to rescan the document. The parent scopes that work to the fragment that just arrived. Purely additive: the emitted stub ignores the argument, and consumers that only read the id are unaffected.
- 5f5241d: Simplify the recursive `JSX.Ref` definition to an equivalent form that's easier for TypeScript to expand.
- f8f47ae: Assemble the SSR document in a single pass. `renderToString` and the streaming shell each ran four sequential injection passes (assets, preload links, inline styles, hydration scripts), every one of which searched the document for its anchor and rebuilt it — four full copies of the shell, or of a multi-hundred-KB SSR body. Head content is now concatenated once and spliced with the script tag in one construction, byte-for-byte identical to the previous output. Anchor searches stay demand-driven, so a body-only render (no assets, no preloads, no inline styles) never scans the document at all: a missing-needle `indexOf` flattens the string and walks every character, which on a 400KB body costs more than the render's own string work.
- a845f66: Don't serialize `Error.prototype.stack` outside development. Seroval includes it by default, so a thrown server function error — and any error landing in SSR hydration payloads — shipped server file paths and internal function names to the client in production. The stack feature is now disabled on every serialize path (hydration serializer, JSON codec) whenever `NODE_ENV` isn't `development`, on top of any `disabledFeatures` override so compat tuning can't silently reopen the leak. Decoding stays permissive: payloads that do carry a stack (e.g. from a development peer) still round-trip. (The core-side counterpart of solid-start#2241, which only patched start's legacy serializer.)

## 0.50.0-next.31

### Patch Changes

- 442c585: Fix a frame-stream regression where a server-component region nested inside another region (a reply inside a comment) could lose its body after navigating away from a **document-adopted** boundary and back. At t=0 the document omits a used region's `{$frame}` ref from the occurrence record, so a nested reply boots with a partial record and gets its region by DOM discovery. A nested occurrence's record lives in the _root_ frame's store, but tearing its region down on navigation only cleaned top-level occurrences (the ones `#unmountSlot` handles directly) — the nested record was left stranded. Navigating back re-sent the full record, but the stale partial deduped the re-introduced region away and the wrapper re-mounted with empty children, dropping the reply's body.

  Region teardown (`dispose`) now releases its occurrences' records from the store that owns them: `#removeSlotRecord` threads up the frame tree exactly like `#resolveSlotRecord`, and both `dispose` and `#unmountSlot` route record removal through it. A re-navigation then writes the full record and the nested content returns. Covered by `frame-nested-region-renav.spec.js` (an adopt-boot → navigate-away → navigate-back round trip). Frames consumer 6290 → 6296 gz.

## 0.50.0-next.30

### Patch Changes

- b5183ab: Fix a client-owned toggle being unable to hide/show a server-rendered region at t=0. A "used" region (a slot arg whose server content was rendered as markup at SSR) is omitted from the t=0 slot record by design — it shipped in the page — so on adoption the client wrapper received `props[arg] === undefined` and never took ownership of the already-rendered `<dx-frame>` region element. A wrapper that renders that region conditionally (e.g. a comment body behind a collapse toggle) therefore couldn't remove it until a stream re-call re-armed the arg, which is why such toggles worked after navigation but not on the initial page. Adoption now discovers the interior's region elements before invoking each slot callback and threads the EXISTING element into the callback's props (keyed by the arg name), so the wrapper's own reactivity owns it from boot and can hide/show it with no network. Regression-tested in `frame-client.spec.js` and validated end-to-end against `@solidjs/web`'s hackernews example (global collapse now hides comment bodies on first load).
- 78494c3: Fix `ChunkReader` mis-parsing framed streams when a network read boundary lands inside the 12-byte chunk header. The reader only refilled its buffer when it was completely empty, so a partial header (1–11 buffered bytes) was decoded as a truncated hex length — yielding empty/garbage values (`JSON.parse("")` downstream) or a spurious "Malformed server function stream" error. Any proxy, TLS record sizing, or compression layer can split frames this way; single-process/localhost transports rarely do, which is why it only surfaced in deployed environments. Affects both server-function responses (`deserializeStream`) and frame streams (`applyFrameResponse`). The reader now buffers until the full header is present before parsing, and a stream that ends mid-header or mid-payload is reported as malformed instead of silently yielding partial data. Regression-tested with an every-split-position sweep and byte-at-a-time delivery in `test/ssr/frame-wire.spec.js`.
- 78494c3: Escape user-controlled `$key` values before they enter server-component slot markers. An occurrence key rides into HTML comment markers (`<!--slot:row#KEY:start-->`), the `#` prop/occurrence separator, and unquoted `_hk` attribute values, so an unescaped key could terminate a comment (`-->`), inject markup, or forge a prop boundary — the same class as Qwik's marker-injection advisory (GHSA-m6jq-g7gq-5w3c). Keys are now percent-encoded onto a conservative alphabet at the single point occurrences are minted, identically on the stream and document faces (t=0 adoption matches occurrences by byte-identical id), and the encoding is injective so distinct keys never collide. Plain alphanumeric keys are unaffected (`row#c1` stays `row#c1`). Also adds dev-mode integrity checks that report a corrupted slot/placeholder range loudly — naming the likely cause (invalid HTML nesting, or an HTML-rewriting CDN/minifier/translator stripping comments) and recommending `Cache-Control: no-transform` — instead of silently truncating discovery.
- 126571e: Exclude a pending boundary's placeholder scaffolding (`<template id="pl-X">` and its `<!--pl-X-->` end comment) from hydration claim arrays. While a boundary is pending its fallback hydrates into the region between the two; counting the scaffolding shifted every positional text claim, so a reactive text hole in the fallback never adopted the server-rendered node — updates that landed before the boundary resolved appended fresh text beside it as permanent debris (solidjs/solid#2936). The scaffolding stays in the DOM for the `$df` swap; it is only skipped when compacting claimable nodes.
- 8bcf97e: Frame boundaries are now DOM elements instead of branded comment-marker ranges (first half of the element-seams decision — see `docs/frame-seams-decision.md`). A frame mounts _into_ a client-created `<dx-frame>` element (`display:contents` by default, `as` for a semantic/parsing-context tag), and the document producer emits that element at t=0. Because the boundary is a real node, `insert` places it in any position — single, array, or fragment — with no special path, which structurally closes #550 (a frame in an array/fragment position crashed `insertBefore` on the branded object; there is nothing left to special-case). It also removes the marker-splitting and CDN-stripping failure modes a comment range is exposed to.

  API: `createFrameInsertable` → `createFrameElement` (returns `{ element, frame, dispose }`); `adoptFrameRange(start, end, opts)` → `createFrame(element, { adopt: true, ...opts })`; new `FRAME_TAG`/`FRAME_ID_ATTR` exports name the DOM contract. The `$$FRAME` brand and its two `insert`/`normalize` branches are deleted from the core client runtime — so every app (frames or not) sheds those bytes, and the frames consumer shrinks too. Region and slot seams are unchanged in this patch (regions become elements in the follow-up; slots stay ranges by design).

- 4ed84d7: Add a boundary-driven segment reveal hook (`FrameOptions.reveal`), the runtime half of covering async client content revealed inside a streamed server-component segment. A streamed segment's placeholder (`pl-KEY`) is the client-side footprint of the server `<Loading>` boundary that produced it; with a `reveal` hook the consumer reconstructs a client `<Loading>` at that exact seam instead of swapping the placeholder imperatively. The hook receives the placeholder's own template content as the fallback and a `content()` thunk that materializes the segment and renders its client fills; rendering the fills inside the reconstructed boundary means an unboundaried async fill suspends _up to that boundary_ and is covered by the fallback rather than flashing empty — matching how a nested `<Suspense>` covers a not-yet-loaded child. The cost is one boundary per revealed segment, and segments are author-placed `<Loading>` boundaries (a single high one for most apps), so this is React's granularity, not a per-chunk tax. `#syncSlots` gained an internal scoped-fragment mode to render a single segment's fills off-DOM. With no `reveal` hook the imperative swap is unchanged — the framework-agnostic default. Covered by `frame-reveal-boundary.spec.js`; the framework binding (`createLoadingBoundary`) is wired separately. Frames consumer 6191 → 6265 gz.
- 08f696b: Classify function-valued server-component slot args as content by resolving them. A function cannot be serialized, so a function-valued arg must be a thunk producing content (or a getter producing a scalar): the producer now resolves it one-shot (bounded), then classifies the result — JSX (a `{t}` node, or an array of them) ships as a region, a scalar ships as data. This lets top-level one-shot reactive control flow reach the region path when the compiler hands it over as a thunk/memo — `<For each>{…}</For>` resolves to an array of template nodes, `<Show>` to a node or nothing — and fixes a latent bug where a function-valued arg fell into `serialize()` and threw on seroval. Applied on both the stream face (`createSlotProps`) and the document/t=0 face (`createDocumentSlotProps`), so occlusion, arming, and region emission all agree; the stream face also now skips the `$key` identity marker in the args record, matching the document face. Covered by `test/ssr/frame-fn-args.spec.js` (thunks, `<For>`-shaped arrays, nested thunks, scalar getters, and the occluded-thunk case). Client consumer size unchanged (the classification is server-side).
- 5d2aed5: Preserve browser-owned live state across a frame morph. The morph makes server-owned attributes match the streamed output exactly, which would reset a user-toggled `<details open>` / `<dialog open>` on every navigation (the `open` attribute _is_ the toggle, unlike form `value`/`checked`, which are properties that decouple from their attributes after input and so already survive an attribute-only morph). `open` on `<details>`/`<dialog>` is now preserved — never removed, never set by the morph. Adds a `data-preserve` escape hatch: an element marked with it keeps its live attributes and subtree untouched by the morph, for server DOM a third-party widget (rich editor, chart) has taken over or any state the deny-list can't name. Regression-tested in `frame-client.spec.js`. Morph slice 873 → 945 gz (still ~360 under micromorph); frames consumer re-guarded 6180 → 6250.
- f183aae: Lock an occluded region against a late async placement (streaming-occlusion single-copy guard). At t=0 the document face decides a region occluded — and serializes its content once as a `sc:region:` data record — at the wrapper's synchronous return. A wrapper that places the region behind an async boundary (a `<Suspense>` that resolves after the shell flush) calls the region's thunk _later_, after that decision; without a guard the late call re-emitted the content as markup, so the same content shipped as both a data record and inline markup — the one thing the single-copy invariant forbids. Each region serialized at the flip is now locked, so a later placement contributes nothing to markup (identical to a region the wrapper never placed; the client mounts it from the record). The decision is committed eagerly at the synchronous return — the conservative side of the ratified policy: never a double-ship, at the cost of that one region adopting from data instead of markup. Covered in `frame-fn-args.spec.js` (the late-placement lock plus a synchronous-placement control that still ships inline). Producer-side only; the consumer reuses the existing occlusion mount, and the frames client bundle is unchanged.
- cc67433: Route a region's async fragment to the region, not the enclosing frame. A region (a `{$frame}` slot arg carrying server content) is a nested frame the client binds under its own `childId` and owns end-to-end — its range, its morph, its reveal. A `<Suspense>` rendered inside region content, however, streamed its `fragment`/`reveal` under the enclosing frame's root id, because the frame sink is single-id. The initial reveal still landed (the consumer's placeholder search descends into region subtrees), but the root frame's store then held segment state belonging to the region, and since the region morphs independently across responses the two desynchronized. The response-face slot-props getter now wraps `registerFragment` for the window in which each arg resolves, tagging every fragment key it registers to that arg's `childId` (first write wins, so a fragment inside a nested region tags to the innermost region); `sink.fragment`/`sink.reveal` address the tagged region, and a reveal group spanning frames splits per frame. Covered in `frame-region-async.spec.js` (producer routing, a root-fragment control, and an end-to-end reveal into the region's own DOM). A bare async read in a slot arg with no boundary still throws — it has no fallback to show and no fragment to reveal into — now pointing at `<Suspense>`. Producer-side only; the frames client bundle is unchanged.
- 56145d3: Fix occluded frame regions not mounting when a client wrapper reveals them after boot. A region element is created when a slot occurrence's args resolve, but a wrapper that renders its region conditionally (a comment collapsed by default) does not place that element until it expands — so the region must bind and fill from its buffered/streamed chunk while still detached, then reveal in place when the single node is finally inserted. `#bindRegions` gated on `entry.element.parentNode`, which a bare region element never has until placement, so occluded regions never bound and stayed empty on expand (surfaced end-to-end in `@solidjs/web`'s occlusion adoption test once regions became elements). Since a region is now a single element that always exists — unlike the old marker range, which needed a fragment/DOM parent to be meaningful — binding is eager and needs no placement gate. Regression-tested in `frame-client.spec.js` ("an occluded region binds detached and fills before the wrapper places it").
- 2a5706a: Frame regions (server content passed through a client wrapper — `props.children` / `<props.comment>{serverJSX}</props.comment>`) are now DOM elements instead of comment-marker ranges, completing the boundary+region half of the element-seams decision (`docs/frame-seams-decision.md`). A region is `<dx-frame>` (`display:contents`, layout-transparent) — the same DOM contract as the boundary, one level down. The wrapper places the region element; on re-call it re-places the same single node (the platform moves the subtree), replacing the marker-range fragment-refill dance. The document producer emits region elements at t=0; the consumer discovers them with a scoped element walk instead of a flat-comment-list + depth-stack pairing.

  Net: the depth-stack region discovery, the fragment-refill in `#resolveArgs`, and the `frame:`-marker range helpers (`frameRegionStartId`/`afterFrameRegion`/`FRAME_REGION_START`) are deleted. The frames consumer drops 6550 → 6331 gz (254 below its pre-decision 6585; core stays 51 lighter for every app from the boundary half). Behavioral change to note: server content inside a region now sits inside a `display:contents` element rather than directly between markers — visually identical, but `parentElement` of the content is the region element. Slots (client positions inside server HTML) remain ranges by design.

- 5395e4a: Remove the `template`/`block` payload mode from the frame runtime (markup compression — send a static template once, then per-instance value chunks). It was dead: the producer only ever emitted `html`, so the consumer half (`chunkToRecords` template/block cases, `#materialize`'s block leg, `materializeBlock`, the block-waits-for-template readiness gate, the `tpl:` store keys, and the chunk types) never ran. Per the element-seams decision, structural compression of repeated markup is explicitly not pursued: repeated structure in one HTML stream is ordinary HTML (gzip's job), not a single-copy violation, and the only content deduplication worth doing is the **free reference-equality** the serializer already provides (seroval emits one copy and a `{$ref}` when the same server-content reference is serialized twice — opportunistic, rare, no new code). Adoption / DOM recovery of rendered content at t=0 is a separate, kept faculty and never used these chunks. Frames consumer drops 6331 → 6091 gz (494 below the pre-decision 6585). See `docs/frame-seams-decision.md`.
- 340ba58: Remove the "recoverable from the page" substring heuristic from t=0 server-component slot arming: primitive/string args now ship unconditionally in their t=0 slot record. Previously an arg was dropped whenever its escaped value appeared as a substring of the occurrence's rendered HTML, which silently corrupted correct args (`cid={1}` read `undefined` at boot whenever a "1" appeared in any rendered text) and required a new strip-rule for every construct that embeds the occurrence id into markup (`_hk` hydration keys, and — once regions became elements — their `data-fid`).

  This restores the single-copy invariant to its correct shape: **content ships as HTML, and is never ALSO serialized as data** (the RSC double-ship this architecture exists to kill) — the same model as Astro's slots (the Solid adapter parks not-yet-rendered slot content in inert `<template>` elements and recovers it when the client needs it; frames use a hydration data record for the occlusion case, but the idea is identical). Scalar args are a separate concern: they ride the data channel and the client needs them _as data_ to re-invoke its wrapper, so they always ship and are never recovered from the DOM (the DOM is a lossy store for typed values — an arg may drive logic and never render, or render transformed). Structure/content recovery from the DOM stays crucial (t=0 adoption is exactly that); only scalar-data recovery is the mistake. Deletes the `renderedHtmlOf` helper and trims the producer.

## 0.50.0-next.29

### Patch Changes

- 8493c13: `escape()`'s clean-string fast path now uses one native regex scan (`s.search(/[&<]/)` / `/[&"]/`) instead of a JS `charCodeAt` loop — ~30x faster on long text runs, the dominant SSR payload. The slow path still resumes from the first hit so the clean prefix is never re-scanned. Text-heavy SSR throughput (news-page fixture, 50 articles) improves ~40% per render.
- 784aaa9: Type declarations catch up with shipped exports: `adoptFrameRange`
  (frame-client) and `createChunk`/`ChunkReader` (server-functions/shared)
  are now declared — TypeScript consumers of the frames adoption path and
  the shared wire framing no longer hit TS2305. Declaration-only; no runtime
  changes.
- 8493c13: `renderToStream` no longer pays a macrotask of first-byte latency: the shell flush in `pipe`/`pipeTo`/`then` was gated behind `allSettled(...).then(() => setTimeout(...))`, which Node clamps to ~1ms+ per attempt regardless of workload. Flush attempts now run on a microtask drain that keeps yielding while pending fragments are still completing (so an already-settled async read still inlines into the shell with no fallback flash) and falls back to the timer only on a no-progress retry, so a settled-but-stuck root hole cannot starve the event loop. Post-shell task `<script>` batching moved from a timer tick to the same double-microtask discipline — tasks emitted in one resolution burst still coalesce into a single script, without a macrotask between a fragment's template and its activation. Measured on a 10-boundary streaming page: shell TTFB drops from ~1.5–2.3ms to ~0.2–0.3ms (parity with a synchronous shell pass).

  Behavior note: async that settles on a MICROTASK (cached data,
  `Promise.resolve`) still inlines into the shell exactly as before. Async
  parked on a timer or real I/O — however short — now ships its `<Loading>`
  fallback in the shell and streams the content as a fragment, instead of
  occasionally winning the old ~1ms+ macrotask race and inlining. That race
  was scheduling luck, not a contract; if you relied on it, the content still
  arrives in the same stream, activated by the same swap.

## 0.50.0-next.28

### Patch Changes

- 53211cb: The frame host's registration flush applies a frame's buffered chunks as
  ONE store write instead of one apply per chunk. Per-chunk applies ran a
  full slot sync between records, so the first drained record mounted every
  discovered occurrence — the rest record-less — and each later record then
  looked like an args change, re-calling occurrences with incomplete args.
  On adopted (document-SSR) boundaries that re-call rendered without the
  still-undrained args and wiped server-rendered interiors at boot — a flaw
  previously masked by the unconditional claim behavior that `0.50.0-next.27`
  removed. The buffer holds a single version by construction, so the merge is
  exact. If you adopted `0.50.0-next.27`, take this release with it.

## 0.50.0-next.27

### Patch Changes

- 47e93d3: Adopted server-component boundaries no longer drop nested `{$frame}` regions
  on their first post-boot stream (#547). Three coordinated fixes:
  - The t=0 recoverability check strips `_hk` attributes (they embed the
    occurrence's `$key`), so `cid === $key` occurrences arm their records
    instead of matching their own wrapper's hydration key.
  - A slot record whose only difference is ADDED `{$frame}` refs to regions
    the occurrence already holds counts as unchanged — the t=0 record omits
    used regions by design, so the first stream always re-introduces them;
    re-calling would tear out the live ranges. Region discovery now runs for
    armed adopted mounts too (previously record-less only), and a record-less
    adoption's baseline is empty args.
  - `SlotContext` gains `adopted`: true only for the hydration-attach mount of
    an adopted range — the one invocation a consumer may answer with a claim.
    Stream-driven re-calls leave it unset and must render for real; claiming
    them silently dropped whatever the re-call displaced.

- 47e93d3: `transformResult` is now configurable server-wide via
  `configureServerFunctionsServer`, mirroring `transformDirectResult` (#546):
  a generic dispatcher that calls `handleServerFunctionRequest(request)` with
  no options — e.g. a dev server's turnkey middleware — picks up the
  configured transform, so frames' `frameTransformResult` can be installed
  once in the server entry. Per-request options still override, following the
  `collectFlightData` fallback pattern.

## 0.50.0-next.26

### Patch Changes

- ab75717: **Experimental — server components over frame streams.** This ships as an
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

## 0.50.0-next.25

### Patch Changes

- 6da0028: Element-claim contract for navigation-relevant elements (Wave B, dormant):
  - New runtime hooks in the client module: `registerElementClaim(handler)`
    subscribes a consumer (returns an unregister function) and
    `claimElement(node)` invokes registered handlers. With no consumer
    registered every emitted claim is a null check — apps without a routing
    integration pay effectively nothing. The server module exports silent
    no-ops so consumers can register isomorphically.
  - Compiled DOM output (both the Rust compiler and the Babel plugin) now
    claims `a[href]` and `form[action]` elements at creation — including under
    spreads, where the tag is still statically known. Previously reference-free
    static anchors gain a positional walk so the claim call has a target.
  - Compiler-owned writes to `href`/`action` (binding effects and spread
    assigns, which both land in the runtime's `setAttribute`) re-invoke the
    registered handlers, so a consumer's per-element state stays fresh with no
    observers; handlers must be idempotent.

  This is groundwork for router integrations (e.g. link active/pending state
  on plain `<a>` elements without a wrapper component); behavior is inert
  until a consumer registers.

- 314dc9f: Relax server-side method enforcement: declaring `GET` grants GET dispatch without revoking the default POST transport. A GET-declared function now accepts both methods — necessary because routers auto-declare GET on query-wrapped functions that may also be called directly over POST. The security-relevant direction is unchanged: GET requests to functions that never declared it still answer 405.
- a6a0889: Type-level groundwork for typed-path navigation (Wave A):
  - JSX `href` on `<a>`/`<area>` now accepts `SerializableAttributeValue` in
    addition to `string` — the same treatment form `action` already has — so
    URL-bearing objects (e.g. a router's typed path nodes) typecheck directly
    as `href={paths.users(id)}`. SSR serialization of such values is the plain
    `toString()` coercion, now pinned by test.
  - The client-side navigation attribute contract (`link`, `state`, `noScroll`,
    `replace`, `preload`) moved into the shared JSX types on
    `AnchorHTMLAttributes`. These are inert markup on their own; routing
    integrations that delegate anchor clicks read them at event time.
  - New `Href` brand in the response module: a registered-symbol
    (`Symbol.for("solid.Href")`) brand for URL-bearing values, with `isHref()`
    guard. `redirect()` now accepts `string | Href`, coerces branded values via
    `String()`, and throws a `TypeError` for unbranded objects instead of
    silently emitting `[object Object]` in the `Location` header.

- d10a197: Make server-rendered action urls fully self-describing for client interception:
  - The server handler now honors url-encoded bound arguments (`?args=`) for instance-carrying POSTs whose body is a natural HTTP encoding (FormData, urlencoded), not just no-JS posts and GETs. A router intercepting a form whose `action` url came off the wire can post the form data to it verbatim and get the same `[boundArgs..., formData]` reconstruction the no-JS path performs. Codec-serialized bodies are unaffected — client stubs with bound arguments serialize the full argument array in the body and never put arguments in the url.
  - `createServerReference(id, name, base?)` accepts an explicit base url, targeting calls at it verbatim (preserving `?args=`) instead of deriving from the configured endpoint, so integrations can reconstruct a callable from a server-rendered action url while keeping `prepareRequest` hooks, codec config, and single-flight headers uniform.

- 3ea261e: Encode non-latin1 error messages safely in the `X-Server-Function-Error` header. Header values are latin1 ByteStrings, so a thrown error whose message contained CJK, emoji, or other non-latin1 characters made `Headers.set` throw and collapsed the whole call into a bare 500 (solidjs/solid-start#1874 / #2215 — the guard from Start's bespoke handler was lost when the core runtime took over this path). Plain printable-latin1 messages still ride the header verbatim (the historical wire format, byte-identical); anything else travels percent-encoded behind a `=?1?` marker, with CR/LF stripped and lone surrogates well-formed first, so the decoded message round-trips exactly — astral-plane characters included. `ERROR_HEADER`, `encodeErrorHeaderValue`, and `decodeErrorHeaderValue` are exported from the shared/server/client entries (tagged `@internal`) for integrations that surface the header themselves.

## 0.50.0-next.24

### Patch Changes

- 571c6e6: `hydrate()` now installs `sharedConfig.boundaryScopes` and `sharedConfig.captureBoundaryScope` so the reactive library can capture the current root's `{ registry, gather }` pair when a boundary registers for a late resume (solidjs/solid#2917). Multiple hydrate() roots share one `sharedConfig`, but each call replaces the global registry/gather; a boundary resuming after another root has started must claim server DOM against the root it registered under, not whichever root hydrated last. Entries are keyed by the full boundary id (registration-time capture — no prefix parsing, since root id and counter path have no delimiter) and are read and removed by the resume path, which falls back to the live globals when no entry exists. Additive `sharedConfig` surface; no behavior change for single-root hydration.
- 3f1a271: Dev-only source-name metadata for server functions, for dev tooling that inspects registered functions (e.g. a dev-toolbar server-function inspector) — today those surfaces can only label a function by its opaque hash id.
  - **Compiler**: in development (`env: "development"`), `transformDirectives()` emits the extracted function's descriptive source name as a trailing argument to the generated runtime calls — `registerServerReference(id, fn, name)` in server output, `createServerReference(id, name)` in client output. Name resolution matches the existing dev-ID suffix: the function's own name, else the binding/variable name it is assigned to, else the export name; anonymous inline extractions emit nothing. Production output is byte-identical to before — no extra argument, no name leakage — and the argument is trailing/optional, so out-of-band consumers of the ABI (manifests, frameworks) are unaffected.
  - **Runtime**: `registerServerReference` and `createServerReference` accept the optional trailing `name` (an `@internal` ABI parameter like the rest) and seed the reference's metadata channel with `{ name }` as a default — explicit `withMeta`/`GET` writes shallow-merge over it, so a user-provided `name` wins. `ServerFunctionMetadata` gains `readonly name?: string`: a dev-only human-readable label, not unique, not an identity key (use `id` for identity).

- e2c11b0: Land the settled server-function extension surface: `GET(fn)`, the declaration-metadata channel (`withMeta`, `getServerFunctionMetadata`, `isServerFunction`), the `prepareRequest` client hook, and server-side method enforcement — and retire the legacy per-reference escape hatches (`.GET`, `.withOptions`).
  - **`GET(fn)`** (exported from both halves) is the only per-function declaration API. The client half returns a callable that issues GET requests with arguments codec-encoded in the query string (the existing GET transport path) and brands `method: "GET"` on the metadata channel; the server half is identity-flavored — SSR calls stay in-process — branding the same metadata and recording the declared method for the function's id. Compiled function-level directives round-trip the wrapper call in both builds, so no compiler involvement.
  - **The metadata channel** brands every reference (client proxy and server-side callable) with a metadata object under `Symbol.for("solid.ServerFunctionMetadata")` — the same registered-symbol trick as the `ResponseEnvelope` brand, so detection survives duplicated module instances. `getServerFunctionMetadata(fn)` reads the merged bag, `isServerFunction(fn)` is the structural guard, and **`withMeta(fn, meta)`** is the public write path: it attaches arbitrary user-declared transport metadata (shallow-merging later writes) and returns the reference, composing with `GET` in either order — `GET` itself is sugar over the same write. Routers detect capability from metadata instead of property sniffing.
  - **`prepareRequest(init, { id, meta })`** on `configureServerFunctionsClient` is the session-dynamic transport hook — the client-side symmetric of the server handler hooks. It runs before every outgoing server-function fetch over the final `RequestInit` (transport headers included) and can return (or mutate and return) the init the transport will use; `meta` is the reference's declaration metadata, so per-function behavior keys on `withMeta` declarations (e.g. `requiresAuth`) instead of id comparisons. Single hook, not a chain — composition is userland.
  - **Method enforcement**: `handleServerFunctionRequest` answers 405 (with an `Allow` header) when the request method contradicts the declaration — a POST to a GET-declared function, or a GET to a function that never declared it.
  - **The shrunken reference contract** (beta — no compatibility shims): the callable, `url`, and now `id` are kept on both proxies; the `.GET` proxy getter and `.withOptions(init)` are removed. Session-dynamic uses of `withOptions` go through `prepareRequest`; the call-scoped slot is deliberately empty (single-flight opt-in is already automatic via `subscribeFlightData`).

- b3daa7a: Promote single-flight mutations from a SolidStart policy to a generic, router-agnostic protocol in the server function runtime. Previously folding revalidated route data into a mutation response required the framework to hand-build the wire shape in a `transformResult` hook (Start rendered the page data-only and wrapped `{ ..., _$value }` in a `ResponseEnvelope`) while the router fished the value back out by magic key. Now core owns the enveloping, the wire format, and the client-side delivery; integrations own only data production and consumption — both black boxes to the protocol.

  Server side: a first-class `collectFlightData(event, outcome)` hook, registered via `configureServerFunctionsServer({ collectFlightData })` or per-handler through `handleServerFunctionRequest` options. It runs after `transformResult` (which remains the response-metadata extension point), only for scripted calls that sent the `X-Single-Flight` request header, on returned results and thrown `Response`/`ResponseEnvelope` control-flow signals alike — a thrown redirect collects data for the destination route — never for plain thrown errors. The `outcome` carries enough context for any strategy without core assuming one (a data-only render, running route preloads, anything): the function `id`, the unwrapped `value`, the HTTP-metadata `response` (redirect `Location`, `X-Revalidate` keys), the untouched `request` (referrer and any custom headers the client integration sent ride through with no core-assigned meaning), and `thrown`. Whatever payload the hook returns is folded into the body as `{ value, data }` and the response tagged `X-Single-Flight`; returning undefined leaves the response byte-identical to a call without the hook.

  Client side: `subscribeFlightData(consumer)` (universal — lives in the shared layer, exported from both entries) registers the integration's consumer. The transport decodes the standardized payload, awaits `consumer(data, { response })` — the response as envelope context: redirect location, revalidation keys, status — and returns `value` to the caller as if the call were plain. Redirect/error semantics mirror the old passthrough precedence: metadata-carrying responses are the consumer's to interpret (seed caches, navigate — its business), bare error-tagged envelopes throw the value after delivery. Without a registered consumer, single-flight responses pass through whole exactly as before, so existing integrations that decode manually keep working unchanged.

  Wire format: rides the existing body negotiation and chunk framing; the only additions are the `X-Single-Flight` header (request leg: opt-in; response leg: payload marker, both exported as `SINGLE_FLIGHT_HEADER`) and the stable top-level field names `value` / `data` (`SingleFlightPayload`) — no `_$`-prefixed magic keys. The top level is reserved for the protocol, and `data` is any codec-serializable value, which keeps the channel open for future payloads (serialized server-component UI) riding the same mechanism.

- 21807fd: Make subscribing the single-flight opt-in: while a flight-data consumer is registered (`subscribeFlightData`), the client transport sends the request-leg `X-Single-Flight` header itself on every non-GET call — integrations no longer wrap references in `withOptions({ headers })` per call, and a consumer-less app never asks the server to do collection work. GET-encoded calls stay plain: they are reads with cacheable URLs, and folding per-request flight data into them would defeat caching. The server-side gating is unchanged (the hook still only runs for scripted calls that sent the header), and manually sending the header without a consumer still yields the whole-response passthrough for integrations that decode themselves.

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
