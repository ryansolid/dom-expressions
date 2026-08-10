---
"dom-expressions": patch
---

Document-face slot args, two corrections to the case-1 ledger: (1) a not-ready getter arg is now pending PER-ARG — the retry-loop promise takes the value's place and rides the value tier, so the fill renders at the shell with its own boundary covering that read instead of the whole occurrence coarse-holding until the arg settles (a `stats={stats()}` arg that resolves at generation end no longer holds the entire section); the retry's settle re-arms the ledger binding. (2) Slot fill interiors are mint-suppressed: fills are client-owned DOM the adopting frame claims, so a suppression window around the fill render (plus a `$slot` tag the tree walker honors for bare-thunk fills) keeps live-hole markers, `data-lha` addresses, and bindings out of them — a server op morphing inside a claimed fill would replace nodes the client's reactive bindings hold. Fill liveness is the record's story.
