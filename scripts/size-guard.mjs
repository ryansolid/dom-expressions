#!/usr/bin/env node
/**
 * Tree-shaking regression guard for the client runtime (solidjs/solid#2883).
 *
 * Bundles import-subset fixtures from packages/runtime/src/client.js with
 * `rxcore` left external, so the numbers measure ONLY this package's
 * tree-shaken contribution — independent of whichever core the consumer
 * wires in. `"_DX_DEV_"` is text-replaced to `false` exactly like the real
 * consumer build pipelines do (it is a string literal, so esbuild `define`
 * cannot reach it).
 *
 * The ceilings carry ~5% headroom over the sizes at landing: a re-coupled
 * hydration/feature path costs hundreds of bytes against that, so a failure
 * means a tree-shaking regression (or a deliberate feature addition — bump
 * the ceiling in the same PR and say why).
 */
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT = resolve(ROOT, "packages/runtime/src/client.js");
const FRAME_CLIENT = resolve(ROOT, "packages/runtime/src/frame-client.js");
const FRAME_TRANSPORT = resolve(ROOT, "packages/runtime/src/frame-transport.js");
// The decode module: what the frames client's codec glue actually loads
// (the full serializer.js is the encode side + re-exports; importing the
// table through it would charge the re-export indirection to this slice).
const SERIALIZER_DECODE = resolve(ROOT, "packages/runtime/src/serializer-decode.js");

// name -> [entry (import statements or subset against CLIENT), gzip ceiling]
const SCENARIOS = {
  "client: compiled-JSX core (render/template/insert/delegateEvents/effects)": [
    "{ render, template, insert, delegateEvents, className, style, setAttribute, addEvent, spread }",
    4480
  ],
  // Ceiling history: guarded 7950 at landing; 7958 after the boundary-driven
  // reveal round (+60: the revealed fragment's parent on the _$HY.fe hook);
  // 9749 after useHead landed (+1791: the streaming-correct head manager —
  // RFC stage 1's client half: registry, dedupe/diff, hydration adoption).
  // Deliberate feature weight both times — and the compiled-JSX core scenario
  // above stayed byte-stable, so apps using neither pay 0 — re-guarded at
  // 9950. Ratcheted to actual+20 (9749 measured): headroom is where slippage
  // hides, so every future addition re-argues its bytes here. Then +12 net
  // for the head identity/grouping round (reactive group membership,
  // media-qualified meta identity, replaceable icons — initially +95, shaved
  // back by extracting the duplicated attribute-apply loop) — ratcheted to
  // actual+20 (9761 measured). Then found FAILING at 10235 during the
  // cookie-codec round: +474 landed since the last ratchet without the
  // guard being re-run — flagged then, attributed since by per-commit
  // bisect: +463 for client CSS reveal gating (52b5032e, the FOUC-parity
  // round: warm at discovery, gate gateable sheets on load, own at
  // commit), −14 back from its own size pass (46c8f8ae, attr-apply
  // dedupe); +25 for the ambient hydration gather treating frame regions
  // as opaque (6a405f7a); +11 for the ambient cookie-helper stubs
  // (9004d444 — cut again one round later, see below); −11 for the
  // useAssets/Assets/getAssets removal (61f97217). All deliberate
  // feature/correctness weight or since reversed; no accidental
  // server-graph pull-in (the client entry's import graph is
  // constants/reconcile/head/cookies, none of which reach server code).
  // The compiled-JSX core scenario moved +13 in the same window: the
  // waitAsset specifier on the external rxcore import, which esbuild
  // retains per-entry regardless of use — the cost of a new core seam,
  // not a leak. Then +329 for the cookie codec
  // (serializeCookie/parseCookieHeader as real client-entry exports —
  // pure value transformers with legitimate browser uses, never stubs);
  // the compiled-JSX core scenario stayed byte-identical, so apps not
  // importing the codec pay 0. Re-guarded at actual+20 (10564 measured).
  // Then +187 for the server-function decoupling round: the core entry
  // gained the codec-free server-function layer (metadata channel +
  // late-bound RPC seam, server-functions/registry.js) and the flash
  // cookie's isomorphic half (now beside the cookie codec in cookies.js) —
  // the exports that let a router's eager graph drop its static
  // @solidjs/web/server-functions import and with it seroval + the
  // transport (~9 KB gz in a zero-server-function app). The compiled-JSX
  // core scenario stayed byte-identical, and the router-eager-subset
  // scenario below pins the slice apps actually pay. Re-guarded at
  // actual+20 (10751 measured).
  // Then +33 for two correctness fixes from live chat-demo vetting:
  // hydrating inserts keep `current` honest (the phantom-fallback node
  // scan in insertExpression, plus its callers consuming the return) and
  // the container-trace plugin's hook state moving to a registered
  // cross-copy global (the Symbol.for key + shared-state indirection).
  // Both compacted first (-19 from the initial landing); what remains is
  // the checks themselves. Re-guarded at actual+20 (10784 measured).
  // Then +6 for the multi-root hydrate/islands fix: per-root
  // registry/gather re-install across the deferred _assets preload render
  // and renderId-scoped root asset map names. Re-guarded at actual+20
  // (10810 measured).
  "client: full surface": ["*", 10830],
  // The whole server-components consumer: store/versioning, host routing,
  // reveal machinery, slot model, morph, transport, codec glue (seroval
  // external, like everything here). Apps not importing it pay 0 — the two
  // client scenarios above enforce that by being byte-stable.
  // Ceiling history: 4967 at landing (guarded 5220); 5378 after the
  // dynamic-first transport round (multi-mount fan-out + late-mount store
  // seeding, the frame:applied document event, and the stable-component
  // response handler); 5576 after the real-example hardening round
  // (client-owned stream versions, per-version segment-state reset,
  // same-tag morph lookahead); 5889 after the initial-load round (the
  // intercept seam, document-boundary adoption, hydration-claim scoping,
  // marker-driven region discovery for nested occurrences); 6108 after
  // the case-3/hardening round (occlusion flip with async hole-retry,
  // wire bookkeeping deny-list, $ref value-equality re-call guard,
  // unmount store hygiene, claim-safe t=0 args records) — deliberate
  // feature weight, re-guarded at 6250; 6460 after element-claim sweeps
  // (the router link-state contract: seam-read registry, sweep at every
  // materialization site, morph attribute re-claims, ownerScope) —
  // deliberate feature weight, re-guarded at 6600. Then the element-seams
  // decision REMOVED weight: 6585 -> 6550 (boundary is an element; the
  // $$FRAME brand + its insert/normalize branches deleted from core) -> 6331
  // (regions are elements: the depth-stack region discovery, fragment-refill,
  // and frame:-marker range helpers all deleted) -> 6091 (template/block
  // payload mode removed: chunkToRecords cases, materializeBlock, the
  // block-template readiness gate — dead markup-compression the producer never
  // emitted; the only content dedup is free seroval reference-equality) —
  // re-guarded DOWN at 6180. Then +54 for the used-region t=0 props threading
  // (6140) and +64 for the morph live-state deny-list (<details>/<dialog>
  // `open` preservation + the `data-preserve` escape hatch) — deliberate
  // feature weight, re-guarded at 6250. Then the element-seams `as` escape
  // hatch was dropped (fixed `<dx-frame>` tag, no author override) — 6191,
  // re-guarded DOWN at 6220. Then +74 for the boundary-driven reveal hook (the
  // per-`<Loading>` reveal: `#revealSegment` delegates to `options.reveal` so
  // the binding can reconstruct a client `<Loading>` at the seam, and
  // `#syncSlots` gained a scoped-fragment mode so a segment's fills render
  // inside that boundary) — deliberate feature weight, re-guarded at 6290.
  // Then +6 for the nested-region record-cleanup fix (`#removeSlotRecord`:
  // region teardown releases its occurrences' records from the store that owns
  // them — the root's, for a nested occurrence — so a navigate-away-and-back
  // can't dedupe a re-introduced `{$frame}` region against a stranded t=0
  // record and drop a doubly-nested reply's body) — re-guarded at 6330.
  // Then +12 for linear document-boot absorption + stripping error stacks from
  // serialized output outside development — re-guarded at 6350. Then three
  // deliberate feature rounds: +1545 for single-flight with frames (the
  // flight response path: outcome-chunk envelope replay through the codec,
  // ServerComponentPlugin + flightCodec, per-args intrinsic addressing with
  // frameAddress/stableString realm-stable hashing, boundary retention
  // across unmounts, keyed-range cross-parent relocation in the morph);
  // +403 for the call-site handoff (COMPONENT_HANDOFF branding, take/rebind
  // with forward tracking, frame rebind/rebase); +78 for live slot props
  // (ctx.onUpdate: args changes update the mounted binding instead of
  // re-calling); +40 for fetch-metadata stylesheet attribution on reveal —
  // re-guarded at 8600, then ratcheted to actual+20 (8432 measured after a
  // consolidation survey found no removable duplication at the current
  // architecture — the remaining reduction lever is unifying the document
  // reveal scripts with the frame store's reveal machinery, a designed
  // round of its own). Then +53 for the end-of-morph displaced-range sweep
  // (restoreDisplacedRanges: a range whose new position lives inside a
  // wholesale-inserted parent was orphaned in the index while its occurrence
  // stayed "mounted" — the notes search-clear empty-slot bug) — re-guarded
  // at actual+20 (8505 measured). Then +105 for the adopt-time record-race
  // deferral (solidjs/solid#2968: a recordless occurrence waits one
  // macrotask + re-drain while document records may still arrive, instead of
  // misclassifying an invoked slot as argless content) — guarded at 8630
  // (8610 measured). Then Stage 2 of the principles redesign
  // (docs/server-components-principles.md): A5 one-record-shape deleted the
  // consumer's region-threading patches and #547 leniency (−98); the B1
  // resident-store host subsumed the chunk buffer, retention snapshots, and
  // sibling seeding (−88); the DR-1 identity split deleted the handoff
  // protocol outright (COMPONENT_HANDOFF brand/take, forwards map,
  // route-map, documentComponent seam) in favor of per-function components
  // + per-address bindings (−216 net of the binding wrapper). Re-guarded at
  // actual+20 (8208 measured). The #2968 deferral stays until DR-4 (one
  // reveal owner) makes record delivery ordered by construction. Then +20
  // for Stage 4, DR-5 identity-first grafting: the end-of-morph
  // displaced-range sweep (an O(frame) rescan via collectSlots after every
  // apply with leftovers) is replaced by graft sites recorded at insertion —
  // the reconcile pushes each wholesale-inserted root, and one walk over
  // those roots swaps bare pairs for live ranges. Recording-at-insert is
  // the mechanism: every place a range could be owed is on the list by
  // construction, so "a live range was detached because its parent didn't
  // match" stops being a reachable state. Re-guarded at actual+20 (8228
  // measured). Then +12 for the error-apply notification: an `:error`
  // record fires `onApply` (reason "error") once per stream, so a consumer
  // gating on first apply — the shell-gate mount holding its covering
  // boundary open until the frame has content — releases on a failed
  // stream instead of holding a fallback forever. Re-guarded at actual+18
  // (8260 measured). Then two #2977-adjacent fixes (+~100 raw: #564 resets
  // root affinity on rebind so an identical shell still answers the switch;
  // #565 gates slot application on its data refs' ARRIVAL and compares
  // async ref values by identity) paid for by a size pass in the same
  // round: the seg/error store-clear extracted from its three copies
  // (write/apply/rebind — which also fixed rebind never re-arming the
  // error-apply notification), the range-walk and remove-until loops
  // deduped into helpers, get-or-create/regions-dispose/owner-scope
  // helpers, Object.keys loops as for-in, ref predicates simplified, and
  // the shared chunk framing de-duplicating its TextEncoder/Decoder
  // instances. 8263 measured — back under the same ceiling, no bump.
  // Then +17 for the freeze-pass serializer authoring re-export
  // (`createPlugin`/`OpaqueReference` from the runtime's own seroval
  // instance — deliberate, changeset-ed public API: plugins version-pinned
  // by construction, solid-start #1474). The bytes are the re-export
  // statement itself, not implementation: seroval is external here, and
  // esbuild preserves an external module's re-export linkage whether or
  // not the consumer imports the names (import-then-export measures the
  // same), so every serializer consumer pays the plumbing while the
  // implementation stays in seroval. Arrived unratcheted because size.yml
  // triggers on pull_request only and the freeze-pass landed by direct
  // push to next. Re-guarded at actual+20 (8280 measured).
  // Then -52: ResponseEnvelope moved into a PURE-annotated factory so the
  // class (retained solely by its top-level prototype-brand assignment)
  // shakes out of consumers that never construct or brand-check one — the
  // transport only calls isResponseEnvelope. Re-guarded at actual+20
  // (8228 measured).
  // Then +353 for Stage 3 live markup holes, the client half (the reactive
  // pole's morph substrate: `hole`/`attr` chunk codec cases, one flush pass
  // applying range morphs between `<!--lh:N-->` pairs via the same
  // range-anchored reconcile as the root morph and attr patches on
  // `data-lha`-addressed elements, a shared frame-skipping DFS finder, and
  // per-mount identity-dedupe so warm stores replay over re-materialized
  // shells). Initially +522; shaved by collapsing three store passes into
  // one with a single applied-record map (three fields to one), unifying
  // the two DFS finders behind a predicate, parsing attr text through the
  // existing parseFragment, dev-gating the hole-error diagnostic, and
  // regexing the error-prefix and store-clear dispatches. What remains is
  // the mechanism itself — apps not using frames still pay 0 (the
  // compiled-JSX core scenario stayed byte-stable). Re-guarded at
  // actual+20 (8581 measured).
  // Then +245 for Stage 5, the container tier's client halves: the
  // ContainerTracePlugin (trace deserialize/materialize memo + the
  // envelope parse faces) now rides the codec's DEFAULT plugin set — so
  // it lands in THIS scenario through the deliberate static
  // createJSONDataTable import — plus the host's `isContainer` hook and
  // the record-dedupe's identity-only container compare in frame-client.
  // The placement is the shave: an early draft injected the plugin from
  // frame-transport (statically, +238 on the EAGER graph); moving it into
  // the codec defaults keeps real consumers' eager slices at zero (the
  // codec loads lazily there) and this codec-inclusive scenario is the
  // one place that still charges it. Re-guarded at actual+20 (8826
  // measured).
  // Then +13 for the same two live-vetting fixes as the full-surface
  // scenario (hydrating-insert current honesty; container-trace state on
  // a registered cross-copy global — this scenario carries the plugin
  // through the codec defaults, so the shared-state indirection lands
  // here too). Re-guarded at actual+20 (8859 measured).
  // Then +131 for async-value failure wiring: the deserializer's abort
  // sweep (fail every value still pending in the shared refs map — open
  // streams thrown into, pending-promise resolvers rejected with a
  // defusing handler; ~94, in the lazy codec so plain transports pay 0)
  // plus the drain's completion/failure hookup in deserializeStream (~35,
  // eager): a dropped or truncated body now rejects everything stranded
  // instead of hanging promises and streams forever. Server-side teardown
  // (request.signal/cancel → iterator.return) deliberately lives in
  // server.js — zero client bytes. Re-guarded at actual+20 (9004
  // measured).
  "frames: full consumer (runtime + transport + codec glue)": [
    `export * from ${JSON.stringify(FRAME_CLIENT)};
     export * from ${JSON.stringify(FRAME_TRANSPORT)};
     export { createJSONDataTable } from ${JSON.stringify(SERIALIZER_DECODE)};`,
    9024
  ]
};

// The frame reconciler must stay smaller than micromorph's shipped dist
// (1301 gz at last measurement) — a public claim, so it's guarded. The morph
// section isn't exported; it's sliced by its banner comment, which fails
// loudly here if the banner moves.
const MICROMORPH_GZ = 1301;
async function morphSliceScenario() {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(FRAME_CLIENT, "utf8");
  const at = src.indexOf("// --- Morph ---");
  if (at === -1) throw new Error("frame-client.js morph banner not found — update size-guard");
  return src.slice(at) + "\nexport { reconcileChildren };";
}

const prodDefines = {
  name: "dx-prod-defines",
  setup(b) {
    b.onLoad({ filter: /packages\/runtime\/src\/.*\.js$/ }, async args => {
      const { readFile } = await import("node:fs/promises");
      const src = await readFile(args.path, "utf8");
      return { contents: src.split('"_DX_DEV_"').join("false"), loader: "js" };
    });
  }
};

// The codec is late-loaded (server-functions/shared.js loadSerializer):
// every real consumer pipeline code-splits that dynamic import into its own
// lazy chunk (solid-web's packaging resolves it to the external
// @solidjs/web/serialization entry), so the EAGER slice these scenarios
// measure excludes it. esbuild's single-file mode can't split — it inlines
// the import as an __esm wrapper, which both mis-charges the eager number
// and defeats tree-shaking inside the wrapped module — so dynamic imports
// of the serializer go external here; static imports (a scenario that
// deliberately includes the codec) still bundle.
const lazyCodecSplit = {
  name: "dx-lazy-codec-split",
  setup(b) {
    b.onResolve({ filter: /serializer(-decode)?\.js$/ }, args => {
      if (args.kind === "dynamic-import") return { path: args.path, external: true };
      return null;
    });
  }
};

let failed = false;
async function check(name, entry, ceiling, forbid) {
  const result = await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: "js" },
    bundle: true,
    minify: true,
    format: "esm",
    write: false,
    logLevel: "silent",
    external: ["rxcore", "seroval", "seroval-plugins", "seroval-plugins/web"],
    plugins: [prodDefines, lazyCodecSplit]
  });
  const out = result.outputFiles[0].contents;
  const text = result.outputFiles[0].text;
  const gz = gzipSync(out, { level: 9 }).length;
  let ok = gz <= ceiling;
  // Externals are free here but NOT in an app bundle — a scenario that must
  // never reach a heavy external (the codec) asserts its absence by name.
  const leaked = forbid && forbid.filter(marker => text.includes(marker));
  if (leaked && leaked.length) {
    ok = false;
    console.log(`FAIL ${name}: forbidden import(s) reached the bundle: ${leaked.join(", ")}`);
  }
  failed ||= !ok;
  console.log(
    `${ok ? "OK  " : "FAIL"} ${name}: ${out.length} min / ${gz} gz (ceiling ${ceiling})`
  );
}

for (const [name, [imp, ceiling]] of Object.entries(SCENARIOS)) {
  const entry = imp.startsWith("export ")
    ? imp
    : imp === "*"
      ? `export * from ${JSON.stringify(CLIENT)};`
      : `export ${imp} from ${JSON.stringify(CLIENT)};`;
  await check(name, entry, ceiling);
}

// The router eager subset: what a router-only app's EAGER graph reads off
// the core client entry — server-function detection, the late-bound RPC
// seam, and the flash cookie's isomorphic half. This is the codec-decoupling
// contract (the ~9 KB gz seroval + plugin + transport pull-in that every
// zero-server-function app used to pay through @solidjs/router's query.js /
// routing.js): these names must never reach the serializer or the fetch
// transport — the transport registers itself into the seam from
// createServerReference/GET, which only compiled `'use server'` output
// calls. Ceiling at actual+20 (401 measured at landing — flash matcher,
// metadata channel, seam read, plus the per-entry external rxcore import
// esbuild retains regardless of use); the forbidden markers fail the build
// if any seroval external re-enters this slice.
await check(
  "client: router eager subset (server-fn detection + RPC seam + flash helpers, NO codec)",
  `export {
     isServerFunction,
     getServerFunctionMetadata,
     getServerFunctionRPC,
     hasFlashCookie,
     clearFlashCookie
   } from ${JSON.stringify(CLIENT)};`,
  421,
  ["seroval", "seroval-plugins"]
);
// The server-function client's EAGER cost: exactly what compiled client
// output pulls in for a `'use server'` reference — the fetch transport,
// header/framing glue, and the JSON fast path. This is the JSON-fast-path
// contract (the response mirror of the argument path): the server answers
// JSON-safe results as plain JSON and void results body-less, so the codec
// (seroval + the web plugin set, ~5.5 KB gz on top of this number) loads
// only when a Serialized body actually arrives — through shared.js's
// dynamic import, split out of the eager graph by every consumer pipeline
// (modeled by lazyCodecSplit above). The forbidden markers fail the build
// if the codec re-enters this slice statically. Ceiling at actual+20
// (2634 measured at landing: the fetch transport with its single-flight
// and response-seam branches, GET's query encoding, the body negotiation
// table, and the chunk framing/ChunkReader — which stays eager because the
// STREAMING shape of a Serialized response is transport framing; only the
// codec behind it is lazy). Then +95 for the negotiation-guard correctness
// round (#566): isJSONSafe rewritten iterative with ancestor-set cycle
// detection and a depth ceiling (a cyclic value used to RangeError DURING
// encoding and get misreported as the function throwing; deep nesting
// stringify handles fine overflowed the guard's recursion — and it can't
// punt to the codec, whose depth limit protects the decoding peer), plus
// the argument leg's try/catch fallthrough to the codec. Re-guarded at
// actual+20 (2729 measured).
// Then +152 for async-iterable failure wiring, the client's share: the
// call-owned AbortController (minted only when the caller brought no
// signal) whose abort is how a streamed result gets ENDED rather than
// abandoned, the top-level wrap giving that result a `return()` that
// aborts the wire (break in for-await stops the download AND fires
// request.signal server-side), the drain's failure/completion sweep in
// deserializeStream (drop or truncation rejects stranded values instead
// of hanging them forever), and isJSONSafe answering false for iteration
// protocols on plain objects (stringify would ship `{}` and silently
// drop the stream). The abort SWEEP itself is in the lazy codec; the
// server teardown half is in server.js — neither charges this slice.
// Re-guarded at actual+20 (2888 measured).
// Then +7 for the `read` request option (single-flight suppression for
// POST-shaped reads) — the ONLY shared-path bytes of the live()
// declaration, whose reconnect/brand machinery lives entirely inside its
// own export and treeshakes out of this slice (unimported here by
// construction). 2895 measured, ceiling kept.
// Then +59 for bare 5xx and body-less error handling, including single-flight.
// Re-guarded at actual+20 (2954 measured).
// Then +175 for call observers (cloned Request/Response inspection).
// Re-guarded at actual+20 (3129 measured).
await check(
  "server-functions client: eager transport (reference + GET, lazy codec)",
  `export {
     createServerReference,
     GET,
     configureServerFunctionsClient
   } from ${JSON.stringify(resolve(ROOT, "packages/runtime/src/server-functions/client.js"))};`,
  3149,
  ["seroval", "seroval-plugins"]
);
await check(
  // 873 -> 945 gz after the live-state deny-list (`open` preservation +
  // `data-preserve`); -> 1067 after keyed slot ranges learned to relocate
  // across parents during a morph (the single-flight round); -> 1097 after
  // DR-5 identity-first grafting (graft sites recorded at insertion replace
  // the O(frame) end-of-morph rescan — see the full-consumer history above).
  // Still ~200 under micromorph, so the public claim holds — margin re-set
  // to match (actual+20).
  `frames: morph slice (must undercut micromorph's ${MICROMORPH_GZ} gz)`,
  await morphSliceScenario(),
  MICROMORPH_GZ - 184
);
process.exit(failed ? 1 : 0);
