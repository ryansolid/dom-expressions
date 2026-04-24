---
"hyper-dom-expressions": patch
---

Fix ownership leak when composing control-flow components (`For`, `Show`, etc.) in hyperscript (solidjs/solid#2453). `h(...)` now returns a tagged zero-arity thunk whose body runs under `untrack`, so render effects created inside a child component — notably per-row effects created by `mapArray` inside `For` — are rooted under the child's owner instead of whichever `r.insert` effect happens to consume it. Mutating a parent list signal no longer disposes sibling rows' render effects.

The exported surface changes shape: `h(...)` previously returned a DOM node (or array) eagerly; it now returns a thunk you invoke. Recommended usage is `r.render(h(App), mountEl)` — `render` calls the thunk inside its root. Nested `h(...)` calls compose freely; tagged thunks auto-invoke at consumption and user accessors (`() => expr`) continue to route through `r.insert`. `props.children` is uniformly wrapped via `dynamicProperty` the same way other zero-arity function props are, matching Solid JSX's getter convention — consumers that want reactive re-reads wrap the access in a thunk (`h("p", () => props.children)`).
