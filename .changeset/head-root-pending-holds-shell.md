---
"@dom-expressions/runtime": patch
---

useHead: root-level pending head props hold the streaming shell instead of warn-dropping. A pending prop read outside a Loading pass now registers the source with the shell's blocking set (the implicit-blocker semantics root-level async content and effects already have), and the post-settle flush commits the tag. Boundary-attributed tags keep flushing with their fragment, renderToString keeps warn-and-drop, and real errors stay on the existing handling path. Requires rxcore's `ssrHandleError` to support a side-effect-free probe mode (second argument).
