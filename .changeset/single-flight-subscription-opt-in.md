---
"@dom-expressions/runtime": patch
---

Make subscribing the single-flight opt-in: while a flight-data consumer is registered (`subscribeFlightData`), the client transport sends the request-leg `X-Single-Flight` header itself on every non-GET call — integrations no longer wrap references in `withOptions({ headers })` per call, and a consumer-less app never asks the server to do collection work. GET-encoded calls stay plain: they are reads with cacheable URLs, and folding per-request flight data into them would defeat caching. The server-side gating is unchanged (the hook still only runs for scripted calls that sent the header), and manually sending the header without a consumer still yields the whole-response passthrough for integrations that decode themselves.
