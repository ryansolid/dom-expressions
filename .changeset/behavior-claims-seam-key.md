---
"@dom-expressions/runtime": patch
---

Shorten the behavior-claims dispatch seam key to `Symbol.for("dx.bnd")` (mirrors the `_bnd` marker attribute). The key is internal wiring between the delegation walk and the frame runtime; the terse form saves 17 gz in the every-app core slice.
