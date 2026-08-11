---
"@dom-expressions/runtime": patch
---

Fix multi-root hydration for islands — the deferred module-preload path and the root asset map both assumed one hydrate root per page.

**Per-root scope across the deferred render.** When a serialized root `_assets` map defers `hydrate()`'s render behind the module preload, the render moved out of the call's synchronous window — but `sharedConfig` is shared and live. A second `hydrate()` root starting in the same tick (an islands entry-client looping `document.querySelectorAll`) replaced `registry`/`gather` before the first root's deferred render ran, so the first root claimed against the wrong registry (fresh nodes over server DOM), and the first root to finish cleared `hydrating` so every later root rendered unhydrated — its `lazy()` skipped the positional module lookup entirely. Each root now re-installs its own captured `registry`/`gather` and re-arms `hydrating` inside its deferred `.then`, the same per-root pairing late boundary resumes get from `captureBoundaryScope`.

**renderId-scoped root asset maps.** The root module map serialized under the single page-global `"_assets"` name. Integrations that run one `renderToString` per island into the same document (Astro-style) had each island's write clobber the previous one's — only the last island could preload its modules. The root map now serializes under `<renderId>_assets` and `hydrate()` reads its own render's name first, falling back to the bare `"_assets"` for the single-render islands shape (one document render whose islands re-enter through `Hydration` ids and share the one root map). Whole-document renders (renderId `""`) keep the bare name on both sides, unchanged.
