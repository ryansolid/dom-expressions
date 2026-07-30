---
"@dom-expressions/runtime": patch
---

Spread parity for nullish input values (#2957): `value`/`defaultValue` on input/textarea assigned through `spread()` now normalize `undefined`/`null` to an empty string, matching the compiled direct-binding output (`el.value = v ?? ""`) instead of stringifying to "undefined".
