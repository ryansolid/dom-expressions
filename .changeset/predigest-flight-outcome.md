---
"@dom-expressions/runtime": patch
---

Pre-digest the single-flight outcome so `collectFlightData` hooks only supply the data strategy. The handler now computes the generic halves of collection before invoking the hook and hands them over on the outcome: `targetUrl` (the URL the client will show after the mutation — the redirect `Location` resolved against the request URL, or the referring page; undefined without a usable referer or for off-origin redirects), `revalidateKeys` (the outcome's `X-Revalidate` keys, split), and `foldedHeaders` (the request headers with the event's and the outcome's `Set-Cookie` effects applied, later winning). Raw body-carrying `Response` values no longer invoke the hook at all — they are the caller's verbatim payload, with no envelope to fold data into. Existing hooks keep working unchanged; the new fields are additive.

Adds `decodeResponsePayload` beside `decodeResponse`: decodes a transport response and splits the single-flight envelope into `{ value, flightData }`, so integrations handling manually opted-in calls stop reimplementing the payload shape.
