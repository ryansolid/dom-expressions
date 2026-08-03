---
"@dom-expressions/runtime": patch
---

Streamed fragments that settle after hydration completes are held for their claimant instead of discarded: `$df` now consults a claimant flag (`_$HY.fk`) when `_$HY.done` is set, and parks unclaimed swaps in a hold queue (`_$HY.hq`) that a late-registering boundary replays. Fixes server-component boundaries that resolve after the shell flush never mounting (solidjs/solid#2964).
