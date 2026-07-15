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

// name -> [import subset or "*", gzip ceiling in bytes]
const SCENARIOS = {
  "client: compiled-JSX core (render/template/insert/delegateEvents/effects)": [
    "{ render, template, insert, delegateEvents, className, style, setAttribute, addEvent, spread }",
    4480
  ],
  "client: full surface": ["*", 7950]
};

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
for (const [name, [imp, ceiling]] of Object.entries(SCENARIOS)) {
  const entry =
    imp === "*"
      ? `export * from ${JSON.stringify(CLIENT)};`
      : `export ${imp} from ${JSON.stringify(CLIENT)};`;
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
process.exit(failed ? 1 : 0);
