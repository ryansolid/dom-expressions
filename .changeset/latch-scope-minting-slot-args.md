---
"@dom-expressions/runtime": patch
---

Latch scope-minting slot args instead of re-emitting them: an arg expression whose evaluation CREATES reactive scopes (e.g. a projection minted inline in the JSX — `usage={createProjection(...)}`) is not idempotently re-runnable, so the arg-binding ledger no longer opens a watched binding for it. Without the gate, every commit re-ran the getter and minted a fresh projection with a fresh trace — record churn, competing pumps on the same source, and a stream (or document response) that never completed. The gate is the reactive core's scope-creation stamp, the same one the live-holes engine uses for owner-creating holes, applied at first render on both faces and in the sweep (an expression that turns impure later latches too, discarding the minted duplicate). The first-shipped scope's own trace carries its liveness.
