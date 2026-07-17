# solid-refresh fixtures

Each fixture directory contains:

- `code.{js,jsx,tsx}` — the input module.
- `options.json` — optional overrides merged over the vite-plugin-solid
  defaults (`{ bundler: "vite", fixRender: true, jsx: false }`). This is the
  option surface the Babel plugin exposes (`bundler`, `granular`,
  `fixRender`); `importSource` is native-only and tested separately in
  `refresh-options.test.js`.
- `expected.js` — the **frozen reference**: the output of the actual
  solid-refresh Babel plugin (`solid-refresh@0.8.0-next.7`,
  `dist/babel.mjs`), normalized through the harness's Babel re-print
  (printer cosmetics only — literal raws, shorthand, import aliasing,
  comments stripped). These files are the spec for the native pass.
  `refresh-parity.test.js` compares `transformRefresh` output (run through
  the same normalization) against them byte-for-byte AND compares the
  embedded xxhash32 `signature` hashes explicitly — the hashes are the
  HMR-stability contract and are only bit-exact while the native signature
  printer reproduces @babel/generator's default print of the component.
- `output.js` — snapshot of the raw native output, guarded by
  `refresh-fixtures.test.js`. Regenerate with
  `UPDATE_REFRESH_FIXTURES=1 pnpm jest __tests__/refresh-fixtures.test.js`.

The `sig-*` fixtures are deliberate printer torture cases that lock in the
bit-exact signature guarantee: statement/expression/JSX/class/async/comment
formatting, including the regressions found while porting (array-pattern
rest commas, exponentiation left-operand parenthesization, JSX child
indentation, directive quoting).

Fixtures use relative filenames (`src/<fixture>.<ext>`) so the `location`
metadata in the frozen files doesn't depend on the machine or working
directory they were generated on.

The `expected.js` files have no update script on purpose: they change only
when the pass's behavior is changed deliberately, by editing them by hand
(or regenerating with a one-off script against the Babel plugin) in the
same commit that changes the transform, with the diff reviewed as part of
that change.
