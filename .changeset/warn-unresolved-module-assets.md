---
"@dom-expressions/runtime": patch
---

Warn loudly on the server when the asset manifest returns no client assets for a requested module. When `context.resolveAssets` answers null/undefined or with no js entries for a module the render asked about, server-side `lazy()` cannot file the module's hydration asset map entry, the client is unable to preload it, and hydration fails with a cryptic `lazy() module "…" was not preloaded before hydration` error far from the actual cause (an environmental manifest miss, e.g. a dev-manifest bridge that failed to answer). The resolution seam now emits a `console.error` naming the module key and what to check, deduped per module per render. `noScripts` renders (which ship no hydration data) and the `resolveAssetsSync` probe path (which has graceful fallbacks) are excluded.
