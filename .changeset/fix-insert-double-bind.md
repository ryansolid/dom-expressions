---
"dom-expressions": patch
---

Replace the `memo(accessor, true)` wrap in `insert()` with a conditionally
nested render-effect pattern. The memo wrap fixed `<Show>` siblings
re-rendering but introduced two regressions: stale reads broke at the memo
boundary during transitions, and the memo could claim transition ownership
and strand later synchronous writes in stashed queues (the Sierpinski hover
freeze).

The outer effect now reads `accessor()` with `doNotUnwrap` so function
children are preserved without subscribing to their internals. When
function children exist, the outer's compute installs a nested
render-effect that owns DOM writes for this slot (signalled via an
`INNER_OWNED` sentinel so the outer's write callback no-ops). Every
reactive hop on the path is a render-effect with correct stale-value and
transition-ownership semantics. Same node count as before for
function-children slots, one fewer for primitive slots.

Mirrored into `universal.js`.
