---
"@dom-expressions/runtime": patch
---

Fix adjacent expression slots destroying each other's nodes when content
migrates between them. Adjacent compiled slots can share a physical
insertion marker (`null` at the tail, or the next static element), so
marker-based `$$SLOT` ownership collapsed neighboring slots into one
region: exchanges dropped nodes, single-node migrations vanished in both
directions, and array exchanges could crash `reconcileArrays` mid-update —
while the same JSX worked after hydration, where hydratable output emits a
dedicated marker pair per slot.

Ownership is now keyed on per-`insert()` slot identity. Single-slot
parents keep using the physical marker as the ownership tag (their
instruction stream is unchanged); parents hosting multiple expression
slots switch to per-slot identity tokens registered on `parent._$slots`.
Ownership checks accept token-or-marker so content inserted before a
parent becomes multi-slot stays owned across the transition. When a slot's
entire content migrates away in the same flush it receives fresh content,
its position is recovered from the next live slot's region — which also
fixes a pre-existing mis-order where a null-marker slot emptied via `[]`
appended refilled content at the parent's end, after later slots' content.

Scope: DOM renderer (`client.js`) only. `universal.js` is intentionally
unchanged — universal hosts target older JS environments, expando writes
on platform nodes can collide with proxy-based node wrappers, and the
JSX-DOM migration patterns this fix addresses are not idiomatic on
non-DOM platforms. If a real case surfaces on a universal renderer it can
be revisited with a host-appropriate storage strategy.
