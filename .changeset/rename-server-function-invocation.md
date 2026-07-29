---
"@dom-expressions/runtime": patch
---

Rename `getServerFunctionMeta` → `getServerFunctionInvocation` (and its `ServerFunctionMeta` result type → `ServerFunctionInvocation`), resolving the near-collision with `getServerFunctionMetadata(fn)`: the latter reads a reference's static declaration metadata, while this accessor returns info about the call in flight (today `{ id }`). The derived request event's internal locals key follows the rename (`locals.serverFunctionInvocation`). No back-compat alias — beta line, clean rename.
