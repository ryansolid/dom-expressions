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
  "client: full surface": ["*", 7950],
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
  // re-guarded DOWN at 6220.
  "frames: full consumer (runtime + transport + codec glue)": [
    `export * from ${JSON.stringify(FRAME_CLIENT)};
     export * from ${JSON.stringify(FRAME_TRANSPORT)};
     export { createJSONDataTable } from ${JSON.stringify(SERIALIZER)};`,
    6220
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
  // `data-preserve`); still ~360 under micromorph, so the public claim holds.
  `frames: morph slice (must undercut micromorph's ${MICROMORPH_GZ} gz)`,
  await morphSliceScenario(),
  MICROMORPH_GZ - 320
);
process.exit(failed ? 1 : 0);
