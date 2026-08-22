---
"@dom-expressions/runtime": patch
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
---

Gate SSR select-value resolution behind a compiler-armed flag and region-jump the resolver. Compiled output containing a select value binding (or a spread on a select) emits one ssrSelectValues() marker per module; apps that never bind a select value skip the resolution pass entirely — it was costing over half of select-free render time (the first full-output scan pays the rope flatten), worth 2.2x on news-page SSR throughput and it ran per streamed fragment. Armed pages walk only select regions (2.15x on a large page with one bound select) instead of every tag in the document; to make region jumps sound, attribute values now escape `<` alongside `&` and `"` in both compilers (matching React/Octane norms). Raw HTML injected around the compiler gets browser semantics for select values — the forms contract is a JSX-level promise.
