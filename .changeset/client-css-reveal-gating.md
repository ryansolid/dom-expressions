---
"@dom-expressions/runtime": patch
---

Client-side CSS reveal gating for `useHead` stylesheets (FOUC parity with SSR streaming — docs/client-css-reveal-gating.md). A gateable stylesheet registered during a transition or `Loading` discovery pass now starts fetching at discovery (overlapping the data wait instead of serializing after it) and reads as not-ready until it has loaded or errored, so the reveal holds exactly like the server's `$dfs` gate. Gateability reuses the server's classification: extra attributes must be pure fetch metadata (`crossorigin`, `integrity`, `referrerpolicy`, `fetchpriority`); condition-changing attributes (`media`, `title`, `disabled`) exclude a sheet from gating. Cached and adopted server-emitted sheets acquire synchronously with zero wait, and a registration's replaceable tags (title/meta) never wait on CSS.

Mechanics: stylesheets warm as inert `rel="preload" as="style"` links and flip to `rel="stylesheet"` at commit (fetch-identity qualifiers ride the preload, so the flip hits the preload cache) — a branch superseded before it commits leaks only an inert preload, never an applied sheet. Warm links inserted while the document is still render-blocked are stamped with the native `blocking="render"` attribute. Errored sheets release the gate (parity with the server gate's `onerror`).

New surface:

- `warmAsset(descriptor)` (`@internal`, client): idempotent, refcount-free warm half of `acquireAsset`; returns the registry entry with `loadState: "pending" | "loaded" | "errored"` and `loadPromise` (resolves on load or error, never rejects).
- Optional `waitAsset(promise)` rxcore seam: throws the core's not-ready error while the promise is unsettled so tracked contexts hold and retry on settle. Cores that don't provide it degrade gracefully — the gate is disabled, warm-at-discovery still works.
