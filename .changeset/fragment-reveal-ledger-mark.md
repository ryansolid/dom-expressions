---
"dom-expressions": patch
---

Record streamed-fragment reveals in the hydration ledger: `$dfr` marks
`_$HY.v[id]` when it swaps content in, so the runtime can answer "which
declared fragments are still outstanding" from records — across the
pre-boot window — instead of scanning the document for `pl-*` templates.
Recording only; reveal policy stays with the hydration runtime's `_$HY.f`.
