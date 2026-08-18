---
"@dom-expressions/runtime": patch
---

Fix a crash in delegated event handling when an event targets the render root while a portal container (e.g. a Portal mounted to `document.body`) is an ancestor of that root (solidjs/solid#3008). The container's handler resumed from the root's completed walk with a boundary below the resume point — an assumption that only holds for nested roots — and climbed past `#document` into `undefined`, throwing on every such event. The handler now returns when it resolves the same owner whose walk already completed, and `walkUpTree` gained a null guard matching the file's other climbing loops.
