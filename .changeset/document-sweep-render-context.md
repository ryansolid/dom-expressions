---
"@dom-expressions/runtime": patch
---

Restore the mint-time render context around live-hole sweep evaluation. Sweeps re-ran holes under `runWithOwner`, which restores the reactive owner but not `sharedConfig.context` — on the document face the module global points at whatever rendered last by the time a commit lands, so context-gated emissions inside re-evaluated holes (behavior claims' `_bnd` markers) silently dropped and claim-carrying elements shipped inert. The engine now captures the render context when a hole is minted and swaps it in around content and attr sweep evaluation.
