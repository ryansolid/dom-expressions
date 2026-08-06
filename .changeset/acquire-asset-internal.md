---
"@dom-expressions/runtime": patch
---

Mark `acquireAsset` `@internal` in the client and server type declarations. Per the head-management RFC's policy, ambient bundler-injected CSS is never lifecycle-managed and the head registry owns the lifecycle of directly-mounted stylesheets outright, so `acquireAsset` is internal machinery for its non-head roles (exclusive slots, owner-following DOM ownership) rather than a public CSS-lifecycle API. It stays exported; only the typedoc surface changes.
