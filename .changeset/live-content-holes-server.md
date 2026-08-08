---
"@dom-expressions/runtime": patch
---

Live markup holes, server half (Stage 3): in live frame renders, thunk-compiled content holes are wrapped in identified comment pairs and open bindings in the response's DR-2 ledger — commits re-run the thunk, equality-gate the resolved HTML, and re-emit changed holes as keyed `hole` chunks. Slot positions and holes that emit slot records are excluded (records are emit-once); the document face is untouched (t=0 first-value lock).
