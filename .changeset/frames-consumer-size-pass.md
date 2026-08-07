---
"@dom-expressions/runtime": patch
---

Size pass on the frames consumer paying for the slot data-ref fixes (back under the guard ceiling), deduplicating the per-stream store reset — which also fixes rebind never re-arming the once-per-stream error-apply notification, so a switched address's failed stream still releases a first-apply gate
