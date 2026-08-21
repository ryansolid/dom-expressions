---
"@dom-expressions/runtime": patch
---

Tighten the split CSP nonce API: a `{ script, style }` pair requires both keys (`false` leaves a destination un-nonced), `context.nonce` stays the user-supplied value, and `scriptNonce` / `styleNonce` project a half for script-only surfaces (`HydrationScript`, `generateHydrationScript`, `createSSRResponse`) which remain `string`.
