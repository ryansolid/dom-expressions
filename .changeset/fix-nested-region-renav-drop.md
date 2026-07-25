---
"@dom-expressions/runtime": patch
---

Fix a frame-stream regression where a server-component region nested inside another region (a reply inside a comment) could lose its body after navigating away from a **document-adopted** boundary and back. At t=0 the document omits a used region's `{$frame}` ref from the occurrence record, so a nested reply boots with a partial record and gets its region by DOM discovery. A nested occurrence's record lives in the *root* frame's store, but tearing its region down on navigation only cleaned top-level occurrences (the ones `#unmountSlot` handles directly) — the nested record was left stranded. Navigating back re-sent the full record, but the stale partial deduped the re-introduced region away and the wrapper re-mounted with empty children, dropping the reply's body.

Region teardown (`dispose`) now releases its occurrences' records from the store that owns them: `#removeSlotRecord` threads up the frame tree exactly like `#resolveSlotRecord`, and both `dispose` and `#unmountSlot` route record removal through it. A re-navigation then writes the full record and the nested content returns. Covered by `frame-nested-region-renav.spec.js` (an adopt-boot → navigate-away → navigate-back round trip). Frames consumer 6290 → 6296 gz.
