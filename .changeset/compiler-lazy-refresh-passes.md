---
"@dom-expressions/compiler": patch
---

Add two new experimental, independent passes that port the remaining Babel transforms of the Solid toolchain's dev support pass to native:

`transformLazy(code, options)` (and `transformLazyAsync`) — the `lazy()` module-URL pass from vite-plugin-solid's `lazy-module-url` plugin. Detects `lazy(() => import("specifier"))` calls where `lazy` is a named import from `solid-js` and appends the frozen `"__SOLID_LAZY_MODULE__:<specifier>"` placeholder argument that the bundler plugin's `resolveLazyModuleUrls` resolves afterwards. Verified against frozen outputs of the Babel reference across import-binding, shadowing, and non-matching edge cases.

`transformRefresh(code, options)` (and `transformRefreshAsync`) — the solid-refresh HMR transform (solid-refresh@0.8.0-next.7, `jsx: false` mode as vite-plugin-solid invokes it). Supports the `bundler` (`esm`/`vite`/`webpack5`/`rspack-esm`/`standard`), `granular`, and `fixRender` options plus `@refresh skip`/`@refresh reload` pragmas, and emits the frozen runtime ABI (`$$registry`/`$$component`/`$$refresh`/`$$decline`) with bit-exact xxhash32 signature hashes — the native signature printer reproduces `@babel/generator`'s default print of the component so HMR state survives the Babel→native swap without spurious remounts. The runtime import source is configurable via `importSource` (default `"solid-refresh"`, byte-for-byte like the Babel plugin; override to `solid-js/refresh` for the in-core runtime). A frozen parity suite compares whole outputs and signature hashes against committed reference files generated from the actual Babel plugin, including printer torture fixtures.

Not ported (rejected or documented): the plugin's `jsx: true` JSX-granularity mode (its standalone default; vite-plugin-solid always passes `jsx: false`), the typed-but-ignored `imports` option, and exotic TypeScript types inside component signatures fall back to raw source slices when printed.
