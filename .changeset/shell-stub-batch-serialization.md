---
"@dom-expressions/runtime": patch
---

Batch pre-shell pending-promise hydration stubs (fragment `_fr` declarations and thrown async sources) into a single seroval write flushed at the top of the shell drain loop. Every write previously spun up a full crossSerializeStream session, and an async-heavy shell paid N of them just to emit formulaic deferred stubs — ~30% of shell CPU on a 10-boundary page. One object write collapses the session cost and a small spreader task files each entry under its real `_$HY.r` key; settled-before-shell fulfillments still land in the shell (the drain-turn runway is preserved), and custom serializer/sink overrides (frame codec) keep the original per-key writes.
