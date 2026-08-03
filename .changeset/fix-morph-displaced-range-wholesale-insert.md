---
"@dom-expressions/runtime": patch
---

Restore displaced slot ranges into wholesale-inserted parents at end of morph. The frame-wide displaced-range index only applied where the reconcile descended into a matched parent; a new parent with no old counterpart is inserted wholesale from the parsed source, carrying bare marker pairs, so a live range for the same occurrence stayed orphaned in the index while the occurrence remained "mounted" over detached nodes — the slot rendered empty and no later sync could recover it (the record dedupe sees an already-mounted occurrence). An end-of-morph sweep now swaps each remaining indexed range into its bare marker pair in the final content. Fixes the notes-demo search shape: filtering a server-rendered list down and back up (typing then clearing a search) left the regrown rows blank.
