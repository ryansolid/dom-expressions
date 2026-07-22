---
"@dom-expressions/runtime": patch
---

`hydrate()` now installs `sharedConfig.boundaryScopes` and `sharedConfig.captureBoundaryScope` so the reactive library can capture the current root's `{ registry, gather }` pair when a boundary registers for a late resume (solidjs/solid#2917). Multiple hydrate() roots share one `sharedConfig`, but each call replaces the global registry/gather; a boundary resuming after another root has started must claim server DOM against the root it registered under, not whichever root hydrated last. Entries are keyed by the full boundary id (registration-time capture — no prefix parsing, since root id and counter path have no delimiter) and are read and removed by the resume path, which falls back to the live globals when no entry exists. Additive `sharedConfig` surface; no behavior change for single-root hydration.
