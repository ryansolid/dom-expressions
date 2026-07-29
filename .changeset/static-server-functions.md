---
"@dom-expressions/runtime": patch
---

Add static server functions: `staticFunction(fn)` declares a GET-flavored read whose results are captured to static artifacts during build-time prerendering and served as plain files in production — no server function runs at request time, and a missing artifact throws (a `(function, arguments)` pair the prerender pass never executed is a build coverage error, not a fallback case).

- **`staticFunction(fn)`** (exported from both halves, same compiler round-trip as `GET`) brands `{ method: "GET", static: true }` on the metadata channel and composes with `withMeta` in either order. In development calls behave exactly like a `GET(fn)` declaration (live GET transport); in production the client derives the call's cache key, fetches `${staticEndpoint}/{key}.txt` as a plain asset (no server-function headers, no `prepareRequest`), and decodes the framed payload.
- **`configureServerFunctionsServer({ staticCache })`** is the write-only prerender capture seam: when configured, every settled static-declared call that returned a plain value is serialized to the framed wire format and handed to `set({ id, key, filename, payload, args, value })` — from in-process SSR calls and HTTP GET dispatch alike. Thrown errors, `Response`s, and `ResponseEnvelope`s are never captured (HTTP metadata cannot ride a static file), capture failures never break the observed call, and without a `staticCache` the branch adds zero overhead.
- **`configureServerFunctionsClient({ staticEndpoint })`** (default `"/_server-static"`) names where production clients fetch artifacts — keep it in sync with where the prerender writer puts them.
- **Key derivation is shared and deterministic across peers**: `getStaticCacheKey(id, args, codec)` hashes the id plus the canonical encoded arguments (`encodeArgumentsKey` — sorted-key JSON when JSON-safe, the framed codec string otherwise), and `staticArtifactName(key)` names the artifact file. `isJSONSafe` moved from the client into the shared layer (re-exported unchanged).

See `docs/static-server-functions.md` for the prerender integration contract.
