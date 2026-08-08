---
"@dom-expressions/runtime": patch
---

Live attribute holes (Stage 3): in-tag holes can't carry comment markers, so a tag containing them is element-addressed — the engine injects `data-lha="N"` at the tag open (tag names are template-static, so the splice point is exact) and captures the tag's attribute area as re-runnable parts, including positions dequeued from cross-element `ssrGroup` batches. Commits rebuild the text, equality-gate it, and ship changes as element-keyed `attr` chunks with explicit `removed` name lists; the client patches the addressed element in place through a scratch-template parse. Document SSR injects nothing (t=0 bytes untouched).
