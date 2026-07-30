---
"@dom-expressions/runtime": patch
---

Type the `transformFlightResult` seam. The single-flight fold policy hook was accepted by `configureServerFunctionsServer` and honored as a per-handler override, but never declared in `server.d.ts` — integrations wiring it (the frames policy's `frameTransformFlightResult`) only worked through untyped generated code. Both option surfaces now declare it, with the handler JSDoc updated to match.
