---
"@dom-expressions/runtime": patch
---

Live expression slot args on the document face (DR-2 case 1 at t=0): a getter-shaped slot arg — the same authored shape as a markup hole — now opens a watched binding in the document's live-hole ledger. Commits re-evaluate it under its render owner, equality-gate, and re-ship the occurrence's whole record as a fid-tagged `slot` op on the `sc:live` channel (values ride inline; the hydration serializer carries objects and promises natively, so there is no versioned-ref indirection). Pending re-entries ride the arg retry loop and real errors are terminal, mirroring the stream face exactly — the mode-invariance gap where an expression arg was one-shot at t=0 is closed. Document slot getters are also `$lhSkip`-tagged for parity with the stream face.
