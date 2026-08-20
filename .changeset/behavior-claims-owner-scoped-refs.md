---
"@dom-expressions/runtime": patch
---

Behavior-claim ref props fire under the frame creator's ownerScope: effects, context, and cleanup registration work inside the ref callback, with cleanups bound to the frame's owner (run at disposal, not element replacement).
