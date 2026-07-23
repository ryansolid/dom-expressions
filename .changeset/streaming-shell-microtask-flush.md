---
"@dom-expressions/runtime": patch
---

`renderToStream` no longer pays a macrotask of first-byte latency: the shell flush in `pipe`/`pipeTo`/`then` was gated behind `allSettled(...).then(() => setTimeout(...))`, which Node clamps to ~1ms+ per attempt regardless of workload. Flush attempts now run on a microtask drain that keeps yielding while pending fragments are still completing (so an already-settled async read still inlines into the shell with no fallback flash) and falls back to the timer only on a no-progress retry, so a settled-but-stuck root hole cannot starve the event loop. Post-shell task `<script>` batching moved from a timer tick to the same double-microtask discipline — tasks emitted in one resolution burst still coalesce into a single script, without a macrotask between a fragment's template and its activation. Measured on a 10-boundary streaming page: shell TTFB drops from ~1.5–2.3ms to ~0.2–0.3ms (parity with a synchronous shell pass).

Behavior note: async that settles on a MICROTASK (cached data,
`Promise.resolve`) still inlines into the shell exactly as before. Async
parked on a timer or real I/O — however short — now ships its `<Loading>`
fallback in the shell and streams the content as a fragment, instead of
occasionally winning the old ~1ms+ macrotask race and inlining. That race
was scheduling luck, not a contract; if you relied on it, the content still
arrives in the same stream, activated by the same swap.
