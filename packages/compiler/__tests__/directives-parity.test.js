// Babel vs Oxc parity for the `"use server"` directive pass.
//
// Every fixture is compiled with BOTH implementations — the Babel reference
// from the vite-plugin-solid checkout and the native `transformDirectives` —
// under identical options, in every mode/env combination, and the normalized
// outputs must match exactly (unlike the JSX pass, the directive port targets
// structural and naming parity, not just semantic parity).
//
// When the reference checkout is not present (e.g. CI for this repo alone)
// the suite skips; directives-fixtures.test.js still locks the Rust output.

const {
  referenceAvailable,
  fixtureNames,
  compileBabel,
  compileOxc,
  normalize,
  extractIds
} = require("./directives/harness");

const matrix = [];
for (const mode of ["server", "client"]) {
  for (const env of ["production", "development"]) {
    matrix.push([mode, env]);
  }
}

const describeParity = referenceAvailable() ? describe : describe.skip;
if (!referenceAvailable()) {
  // eslint-disable-next-line no-console
  console.warn(
    "directives-parity: vite-plugin-solid reference checkout not found " +
      "(set SERVER_FUNCTIONS_REFERENCE); skipping Babel parity suite."
  );
}

describeParity('"use server" directive Babel parity', () => {
  for (const fixture of fixtureNames()) {
    describe(fixture, () => {
      it.each(matrix)("%s/%s", async (mode, env) => {
        const babel = await compileBabel(fixture, mode, env);
        const oxc = compileOxc(fixture, mode, env);

        expect(oxc.valid).toBe(babel.valid);
        expect(normalize(oxc.code)).toBe(normalize(babel.code));

        // Every ID baked into the reference output must be reported in the
        // metadata (the manifest contract). The reverse doesn't hold: an
        // extracted function can consume a counter slot and then have its
        // only reference dead-code-eliminated from the client output.
        if (babel.valid) {
          const reportedIds = new Set(oxc.functions.map(fn => fn.id));
          for (const id of extractIds(babel.code)) {
            expect(reportedIds).toContain(id);
          }
        }
      });
    });
  }
});
