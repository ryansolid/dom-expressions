---
"@dom-expressions/runtime": patch
---

Add live slot props to frames: a binding can register `ctx.onUpdate(fn)` during its invocation to receive re-resolved props when a re-sent slot record's args change in value, instead of the occurrence being re-called. The invocation's instance, client state, and DOM identity survive the change; cached `{$frame}` regions are reused/renamed through the existing machinery. Unregistered consumers keep the re-call behavior.
