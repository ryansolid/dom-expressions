---
"@dom-expressions/runtime": patch
---

Don't serialize `Error.prototype.stack` outside development. Seroval includes it by default, so a thrown server function error — and any error landing in SSR hydration payloads — shipped server file paths and internal function names to the client in production. The stack feature is now disabled on every serialize path (hydration serializer, JSON codec) whenever `NODE_ENV` isn't `development`, on top of any `disabledFeatures` override so compat tuning can't silently reopen the leak. Decoding stays permissive: payloads that do carry a stack (e.g. from a development peer) still round-trip. (The core-side counterpart of solid-start#2241, which only patched start's legacy serializer.)
