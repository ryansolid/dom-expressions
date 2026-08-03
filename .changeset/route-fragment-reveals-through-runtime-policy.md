---
"@dom-expressions/runtime": patch
---

Split streamed-fragment reveals into inline mechanics and runtime policy. The stream's inline script keeps only the parse-time swap mechanics (`$dfr`, so streaming still reveals with no JS at all); `$df` now routes through `_$HY.f` when the hydration runtime has installed it — the same one-owner handoff the head-patch runtime uses via `_$HY.h`. The `_$HY.fk`/`_$HY.hq` claimant flag tables and the inline `_$HY.done` policy branch are deleted: late-arrival holds and boundary claims are decided in one place (the runtime), which owns them by construction instead of negotiating through globals.
