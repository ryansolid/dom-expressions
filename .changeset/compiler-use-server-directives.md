---
"@dom-expressions/compiler": patch
---

Add `transformDirectives(code, options)` (and `transformDirectivesAsync`) — an experimental, incomplete port of the `"use server"` directive transform as a second, independent pass alongside the JSX transform. It applies to plain `.js`/`.ts` modules as well as JSX/TSX and follows the Babel reference implementation (vite-plugin-solid `src/server-functions/`, hoisted from SolidStart) with a fixture parity suite checking structural and naming parity.

Covered so far: module-level `"use server"` (exported function declarations, const-assigned functions/arrows, aliased and default exports) in both server and client output modes, function-level `"use server"` on function expressions and arrows (including function declarations bubbled to `const` form), client-side dead-code elimination of server-only code, development-mode ID suffixes, and the frozen runtime ABI — `registerServerReference` / `createServerReference` imports from a configurable module and `xxhash32(relative path)-<count>` function IDs interchangeable with the Babel output. The result reports extracted function metadata (`{ id, name, exports }`) alongside `{ code, map, valid }` for bundler manifest building.

Not yet ported: server functions nested inside other extracted server functions, object/class method directives, and sourcemap fidelity through the client DCE pass.
