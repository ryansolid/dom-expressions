---
"@dom-expressions/runtime": patch
---

Frame boundaries are now DOM elements instead of branded comment-marker ranges (first half of the element-seams decision — see `docs/frame-seams-decision.md`). A frame mounts *into* a client-created `<dx-frame>` element (`display:contents` by default, `as` for a semantic/parsing-context tag), and the document producer emits that element at t=0. Because the boundary is a real node, `insert` places it in any position — single, array, or fragment — with no special path, which structurally closes #550 (a frame in an array/fragment position crashed `insertBefore` on the branded object; there is nothing left to special-case). It also removes the marker-splitting and CDN-stripping failure modes a comment range is exposed to.

API: `createFrameInsertable` → `createFrameElement` (returns `{ element, frame, dispose }`); `adoptFrameRange(start, end, opts)` → `createFrame(element, { adopt: true, ...opts })`; new `FRAME_TAG`/`FRAME_ID_ATTR` exports name the DOM contract. The `$$FRAME` brand and its two `insert`/`normalize` branches are deleted from the core client runtime — so every app (frames or not) sheds those bytes, and the frames consumer shrinks too. Region and slot seams are unchanged in this patch (regions become elements in the follow-up; slots stay ranges by design).
