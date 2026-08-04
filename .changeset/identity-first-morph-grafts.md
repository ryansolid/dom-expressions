---
"@dom-expressions/runtime": patch
---

Identity-first morph (server-components principles DR-5): the reconcile
records each wholesale-inserted subtree root as a graft site, and one
post-reconcile walk swaps bare slot marker pairs inside those subtrees for
the occurrence's live client-owned range from the frame-wide index —
interior, and the client state mounted in it, intact. Replaces the
end-of-morph `restoreDisplacedRanges` repair pass, which rescanned the whole
frame with `collectSlots` after every apply that left displaced entries.
Recording at insertion makes "a live range was detached because its parent
didn't match" unreachable by construction: every place a range could be owed
is on the list, at O(inserted) instead of O(frame). Range placement (stashed
fragment vs attached start marker) is unified in a single `placeRange`
helper shared by the reconcile's marker branch and the graft walk.
