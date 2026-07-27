---
"@dom-expressions/runtime": patch
---

Frames: make document-boot absorption linear instead of quadratic

Three costs in the frame client scaled superlinearly with content size on an adopted document boot (measured on a 1,365-comment page, ~4x CPU throttle):

- The host's pending-chunk buffer rescanned the whole buffer per chunk (`reduce` for the max version plus a `filter` copy). Every t=0 slot record funnels through it before the boundary binds, so buffering N records was O(N²) — ~1.9M closure calls on the test page. The buffer now tracks its version explicitly and each chunk is O(1).
- The adopt constructor ran a second full `#syncSlots` walk even when the registration flush had already synced (every apply ends in `#flush` → `#syncSlots`). It now only syncs when no buffered chunk arrived.
- `#syncSlots` re-ran `#discoverRegions` after an invoke that claimed the adopted DOM in place, where the pre-invoke discovery had already seen the untouched interior. The rescan now only runs when the callback actually rendered.

Together with the claim-registry fix in `@solidjs/web/frames`, this cut the frames demo's absorption JS roughly in half and its Lighthouse Total Blocking Time from 140ms to 66ms.
