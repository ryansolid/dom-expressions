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
const SERIALIZER = resolve(ROOT, "packages/runtime/src/serializer.js");

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
  // actual+20 (9761 measured).
  "client: full surface": ["*", 9781],
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
  // (8260 measured).
  "frames: full consumer (runtime + transport + codec glue)": [
    `export * from ${JSON.stringify(FRAME_CLIENT)};
     export * from ${JSON.stringify(FRAME_TRANSPORT)};
     export { createJSONDataTable } from ${JSON.stringify(SERIALIZER)};`,
    8278
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

let failed = false;
async function check(name, entry, ceiling) {
  const result = await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: "js" },
    bundle: true,
    minify: true,
    format: "esm",
    write: false,
    logLevel: "silent",
    external: ["rxcore", "seroval", "seroval-plugins", "seroval-plugins/web"],
    plugins: [prodDefines]
  });
  const out = result.outputFiles[0].contents;
  const gz = gzipSync(out, { level: 9 }).length;
  const ok = gz <= ceiling;
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
