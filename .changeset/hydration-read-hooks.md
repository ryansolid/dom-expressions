---
"@dom-expressions/runtime": patch
---

Hydration-time behaviors reached from hot client paths — `insert()`'s initial-claim and swapped-region reclaim walk, `insertExpression`'s hydration gate, and `eventHandler`'s replay dedup — move behind a nullable runtime slot installed by `hydrate()`. Client-only bundles shake the implementations (~450 min / ~194 gzip bytes under esbuild-class bundlers; Rollup-based bundlers already proved these paths dead and are byte-identical). `installHydrationRuntime()` is exported for embedders that simulate hydration state without entering through `hydrate()`.
