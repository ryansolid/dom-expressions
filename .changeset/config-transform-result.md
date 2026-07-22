---
"@dom-expressions/runtime": patch
---

`transformResult` is now configurable server-wide via
`configureServerFunctionsServer`, mirroring `transformDirectResult` (#546):
a generic dispatcher that calls `handleServerFunctionRequest(request)` with
no options — e.g. a dev server's turnkey middleware — picks up the
configured transform, so frames' `frameTransformResult` can be installed
once in the server entry. Per-request options still override, following the
`collectFlightData` fallback pattern.
