---
"@dom-expressions/runtime": patch
---

Serialize boundary lazy-module maps (`<id>_assets`) as snapshots instead of the live mutable object. The map keeps mutating after its first stream write — a nested lazy under a lazy layout registers during the template-hole drain loop, after the owning boundary already serialized — and seroval's cross-reference dedup turns the re-emission of the same (now mutated) object into a bare back-reference to the stale first snapshot, silently dropping the new entries. On a cold server process (module promises not yet cached) the client never received the nested chunk's hydration-id mapping, `lazyHydrationLookup` threw, and the page halted dead on first visit. Snapshotting at each serialization point (`{ ...map }`) makes every emission carry the map's current contents.
