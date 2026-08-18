---
"@dom-expressions/compiler": minor
---

`transformLazy` now appends the module-URL placeholder as `lazy()`'s third argument (padding the options slot with `void 0` when omitted), matching `clientOnly`'s shape: `solid-js` 2.0's `lazy(fn, options?, moduleUrl?)` takes an `{ export }` options bag in second position. Call sites with an options bag (`lazy(fn, { export: "Name" })`) are now annotated too.
