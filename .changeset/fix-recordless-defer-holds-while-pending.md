---
"@dom-expressions/runtime": patch
---

Defer a recordless adopted occurrence while document records may still arrive, not one macrotask. A streamed document held open on async content (or slow dev-mode module timing) delivers records across many macrotasks; the previous one-shot defer classified the tail of them as direct content, evaluating render-prop callbacks as zero-arg accessors. The re-check now re-arms until `recordsPending` flips false — the same settlement contract the fragment ledger guarantees — and the wait is invisible on screen because an adopted occurrence's server-rendered interior is already in the DOM. (From #559; its remount seed-merge half is superseded by the identity split's resident stores, now pinned by a regression test.)
