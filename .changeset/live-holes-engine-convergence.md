---
"@dom-expressions/runtime": patch
---

Live-holes engine convergence: impurity gates (owner-creation and record stamps latch impure holes), marker-stripped baselines so parent re-emissions fire only on real content change, retry-chain suppression via `$lhSuppress`/`$lhSkip` propagation through `buildAsyncWrap`, and a `ctx.hold()` response window so bounded async traces (iterable-fed holes) stream to completion. Frame Responses now guard against client disconnects: post-cancel writes drop instead of throwing through the serializer.
