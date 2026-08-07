---
"@dom-expressions/runtime": patch
---

Reset the frame's root affinity on `rebind`: the applied-root value and the store's root record are per-stream state, like the version. An address switch can deliver a shell byte-identical to the one on screen (slot-driven content ships its differences as records, not markup); the stale value-skip swallowed the new stream's morph, so `onApply` never fired and a switch gate waiting on it (solid's `isPending` re-arm, solidjs/solid#2977) held forever — the second and every later args switch on a site wedged its source pending with the button-style affordance stuck. Dropping the old root record with it keeps the interim flushes honest: a start chunk or slot write between the rebind and the new stream's html finds no root to re-apply, so the gate can no longer be answered with the previous call's content. Warm re-registrations re-seed their own root record and still answer synchronously.
