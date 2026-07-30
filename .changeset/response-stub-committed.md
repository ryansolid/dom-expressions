---
"@dom-expressions/runtime": patch
---

Export `ResponseStub` — the named shape of the mutable `{ status, statusText, headers }` response head integrations expose as `event.response` via module augmentation (as `@solidjs/router` does; core deliberately does not declare the property on `RequestEvent` itself so augmentations stay conflict-free, but its server-function handler already reads the head's `Set-Cookie` headers when folding single-flight cookies). The stub carries a `committed?: boolean` flag, set by the integration once the response head has been derived/sent from it — consumers that write response metadata during render (e.g. JSX response components) must treat later status/header writes and cleanup-time retractions as no-ops. It is a placeholder the real `Response` is derived from, which is why the head commits while the body may still be streaming. Types + docs only — no runtime behavior change.
