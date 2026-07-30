---
"@dom-expressions/runtime": patch
---

Rename `getServerFunctionMeta` → `getServerFunctionInvocation` (and its `ServerFunctionMeta` result type → `ServerFunctionInvocation`), resolving the near-collision with `getServerFunctionMetadata(fn)`: the latter reads a reference's static declaration metadata, while this accessor returns info about the call in flight (today `{ id }`). The invocation state also moves out of `event.locals` (user/integration space — and derived events share locals with their outer event, so nested or concurrent calls leaked and overwrote each other's state) into a module-private WeakMap keyed by the per-call request event; no `serverFunctionMeta`/`serverFunctionInvocation` key ever appears in locals. No back-compat alias — beta line, clean rename.
