---
"@dom-expressions/runtime": patch
---

Behavior-claim event arming flows through the new `delegate` host option on `createFrameHost` (platform glue passes `delegateEvents`) instead of a module-scope global published by the core client entry — the top-level publication retained the whole event system in every tree-shaken subset of the client entry (the router eager subset tripled). The dispatch-time seam read now lives entirely inside the delegation walk: zero top-level bytes, and markers adopted before the frame runtime loads still resolve on first dispatch after it does.
