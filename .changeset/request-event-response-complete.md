---
"@dom-expressions/runtime": patch
---

Declare the full request event contract on `RequestEvent`: the optional `response` head (`ResponseStub` — the mutable `{ status, statusText, headers }` scaffold an integration's handler exposes so rendering code can contribute response metadata; core's server-function handler already read its `Set-Cookie` headers when folding single-flight cookies) and a new `complete?: boolean` flag. `complete` is set to `true` by the integration's handler once the response head has been sent — status and headers can no longer change — and consumers that write response metadata during render (e.g. JSX response components) must treat writes and cleanup-time retractions after `complete` as no-ops. Core never sets it in `handleServerFunctionRequest` (that handler returns `Response` objects synchronously with respect to the head); it exists for SSR/streaming handlers. Types + docs only — no runtime behavior change.
