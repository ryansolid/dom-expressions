// Harness for `"use server"` directive parity checking.
//
// The reference implementation is the Babel-based transform living in the
// vite-plugin-solid checkout (`src/server-functions/`, hoisted from
// solid-start). Its source is TypeScript, so the harness transpiles each
// module on the fly with vite-plugin-solid's own @babel/core +
// preset-typescript (no extra devDependency, no build step) and evaluates it
// in a tiny CommonJS module cache.
//
// The reference checkout is located via SERVER_FUNCTIONS_REFERENCE or the
// conventional sibling path `../vite-plugin-solid` next to the dom-expressions
// checkout; when absent (e.g. CI), the parity suite skips and the snapshot
// suite (directives-fixtures.test.js) still guards the Rust output.

const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const compilerDir = path.resolve(__dirname, "../..");
const referenceRepo =
  process.env.SERVER_FUNCTIONS_REFERENCE || path.resolve(compilerDir, "../../../vite-plugin-solid");
const referenceDir = path.join(referenceRepo, "src", "server-functions");

const { transformDirectives } = require(compilerDir);

// Both compilers are pointed at the frozen runtime ABI:
// registerServerReference / createServerReference from a configurable module.
const RUNTIME = "@solidjs/web/server-functions";
const ROOT = "/project";
const DIRECTIVE = "use server";

function referenceAvailable() {
  return fs.existsSync(path.join(referenceDir, "compile.ts"));
}

let referenceCompile = null;
let referenceBabel = null;

function loadReference() {
  if (referenceCompile) return referenceCompile;
  const requireReference = createRequire(path.join(referenceRepo, "package.json"));
  const babel = requireReference("@babel/core");
  const presetEnv = requireReference("@babel/preset-env");
  const presetTs = requireReference("@babel/preset-typescript");
  referenceBabel = babel;

  const cache = new Map();
  function loadTsModule(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const source = fs.readFileSync(file, "utf8");
    const { code } = babel.transformSync(source, {
      babelrc: false,
      configFile: false,
      filename: file,
      presets: [[presetEnv, { targets: { node: "current" } }], presetTs]
    });
    const mod = { exports: {} };
    cache.set(file, mod);
    const localRequire = spec => {
      if (spec.startsWith("./") || spec.startsWith("../")) {
        let target = path.resolve(path.dirname(file), spec);
        if (!fs.existsSync(target)) target = target.replace(/\.js$/, ".ts");
        return loadTsModule(target);
      }
      return requireReference(spec);
    };
    const factory = new Function("exports", "require", "module", "__filename", "__dirname", code);
    factory(mod.exports, localRequire, mod, file, path.dirname(file));
    return mod.exports;
  }

  referenceCompile = loadTsModule(path.join(referenceDir, "compile.ts")).compile;
  return referenceCompile;
}

// --- Fixtures ----------------------------------------------------------------

const fixtureDir = path.join(__dirname, "fixtures");

function fixtureNames() {
  return fs
    .readdirSync(fixtureDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

function fixtureSourceFile(fixture) {
  for (const name of ["code.js", "code.ts", "code.jsx", "code.tsx"]) {
    const file = path.join(fixtureDir, fixture, name);
    if (fs.existsSync(file)) return file;
  }
  throw new Error(`No code.{js,ts,jsx,tsx} for directives fixture ${fixture}`);
}

function fixtureId(fixture) {
  const ext = path.extname(fixtureSourceFile(fixture));
  return `${ROOT}/src/${fixture}${ext}`;
}

function readFixture(fixture) {
  return fs.readFileSync(fixtureSourceFile(fixture), "utf8");
}

// --- Compiling ----------------------------------------------------------------

async function compileBabel(fixture, mode, env) {
  const compile = loadReference();
  const result = await compile(fixtureId(fixture), readFixture(fixture), {
    mode,
    env,
    directive: DIRECTIVE,
    root: ROOT,
    definitions: {
      register: { kind: "named", name: "registerServerReference", source: RUNTIME },
      create: { kind: "named", name: "createServerReference", source: RUNTIME }
    }
  });
  return { valid: result.valid, code: result.code };
}

function compileOxc(fixture, mode, env) {
  const result = transformDirectives(readFixture(fixture), {
    filename: fixtureId(fixture),
    root: ROOT,
    mode,
    env,
    directive: DIRECTIVE,
    register: { kind: "named", name: "registerServerReference", source: RUNTIME },
    create: { kind: "named", name: "createServerReference", source: RUNTIME }
  });
  return { valid: result.valid, code: result.code, functions: result.functions };
}

// --- Normalization --------------------------------------------------------------
//
// Unlike the JSX parity harness, the directive transform targets *identical*
// structure and naming, so normalization only erases printer cosmetics:
// both outputs are re-parsed and re-printed through the reference Babel
// generator with literal raws stripped.

function normalize(code) {
  const babel = referenceBabel;
  const t = babel.types;
  return babel.transformSync(code, {
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ["jsx", "typescript"] },
    comments: false,
    compact: false,
    plugins: [
      () => ({
        visitor: {
          NumericLiteral(p) {
            p.node.extra = null;
          },
          StringLiteral(p) {
            p.node.extra = null;
          },
          TemplateLiteral(p) {
            for (const quasi of p.node.quasis) {
              const cooked = quasi.value.cooked;
              if (cooked == null) continue;
              quasi.value.raw = cooked
                .replace(/\\/g, "\\\\")
                .replace(/`/g, "\\`")
                .replace(/\$\{/g, "\\${");
            }
          },
          ObjectProperty(p) {
            p.node.shorthand = false;
          },
          ImportSpecifier(p) {
            // `import { x }` vs `import { x as x }` print differently for
            // the same binding.
            if (t.isIdentifier(p.node.imported) && p.node.imported.name === p.node.local.name) {
              p.node.local = t.identifier(p.node.local.name);
            }
          }
        }
      })
    ]
  }).code;
}

// Function IDs embedded in compiled output (`hash-count` or
// `hash-count-name` in development).
function extractIds(code) {
  const matches = code.match(/"[0-9a-f]{1,8}-\d+(?:-[A-Za-z0-9_$]+)?"/g) || [];
  return [...new Set(matches.map(entry => entry.slice(1, -1)))].sort();
}

module.exports = {
  referenceAvailable,
  fixtureNames,
  readFixture,
  fixtureId,
  compileBabel,
  compileOxc,
  normalize,
  extractIds
};
