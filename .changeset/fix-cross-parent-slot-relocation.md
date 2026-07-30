---
"@dom-expressions/runtime": patch
---

Frame morphs now relocate keyed slot ranges across parents. Occurrence ids are unique within a frame's content, but range preservation was sibling-scoped: deleting an item from a keyed list shifted every range below it into a different parent element, where the morph saw only "new id here", adopted the incoming empty marker pair, and destroyed the live interior — which the slot-record dedupe then never re-invoked (surviving list items rendered blank). The morph indexes the frame's slot ranges frame-wide before reconciling and moves a displaced range — interior intact — into its new position; ranges whose old parent reconciles first are stashed whole instead of removed node-by-node. This also lifts the documented limitation that a server element wrapping each keyed occurrence defeated reorder identity.
