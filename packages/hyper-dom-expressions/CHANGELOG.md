# hyper-dom-expressions

## 0.50.0-next.3

### Patch Changes

- 4c4fb65: Fix ownership leak when composing control-flow components (`For`, `Show`, etc.) in hyperscript (solidjs/solid#2453). `h(...)` now returns a tagged zero-arity thunk whose body runs under `untrack`, so render effects created inside a child component — notably per-row effects created by `mapArray` inside `For` — are rooted under the child's owner instead of whichever `r.insert` effect happens to consume it. Mutating a parent list signal no longer disposes sibling rows' render effects.

  The exported surface changes shape: `h(...)` previously returned a DOM node (or array) eagerly; it now returns a thunk you invoke. Recommended usage is `r.render(h(App), mountEl)` — `render` calls the thunk inside its root. Nested `h(...)` calls compose freely; tagged thunks auto-invoke at consumption and user accessors (`() => expr`) continue to route through `r.insert`. `props.children` is uniformly wrapped via `dynamicProperty` the same way other zero-arity function props are, matching Solid JSX's getter convention — consumers that want reactive re-reads wrap the access in a thunk (`h("p", () => props.children)`).

- 4dae801: Normalize the `repository` field in every package to the standard npm
  convention: a `git+https://github.com/ryansolid/dom-expressions.git` URL
  with a `directory` pointing at the package within the monorepo. Restores
  "View source" / "Open in repo" links on the npm registry and unblocks
  tooling that resolves source from package metadata.

## 0.50.0-next.2

### Patch Changes

- 39c207c: Fix a SyntaxError when an element has 222+ merged dynamic attributes
  (solidjs/solid#2682). The internal identifier generator produced `in` at
  index 221, and since these identifiers are emitted as object shorthand
  destructuring bindings, the resulting `({ …, in }) => …` could not be parsed.
  `getNumberedId` now shifts past any natural index that would encode to a JS
  reserved word, keeping the mapping injective and the output at 2 characters
  for all practical dynamic counts.
- 305d9ce: - SSR: Duplicate attributes in JSX without spreads are now deduplicated —
  `<div class="a" class="b" />` correctly renders as `<div class="b" />`
  (last-wins), matching client behavior. Previously the compiler kept both
  attributes in the output.
  - Client: `setAttributeNS` / `removeAttributeNS` now use matching names when
    clearing namespaced attributes (e.g. `xlink:href`). Previously removal could
    leave the attribute in place because it used the local name while the set
    used the qualified name.
  - Expanded test coverage across all four packages; no other behavior changes.

## 0.50.0-next.1

### Patch Changes

- ee365e0: - `insert()` accepts an optional 5th `options` argument that is forwarded to the
  internal `effect()` call, letting callers (e.g. Solid's `render()`) opt into
  transition-aware initial mounts without otherwise changing `insert`'s
  behavior.
  - SSR: `$dflj(ids)` now materializes every id in the list in a single call
    instead of stopping after the first successful `$dfl`. Callers pass only the
    keys they intend to materialize, which simplifies the primitive and composes
    cleanly for bulk-uncollapse cases (e.g. a group activation revealing several
    held fallbacks at once).
  - SSR: Fix cascading async root holes in the streaming shell. When an inner
    Loading boundary resolved its first chunk while the outer shell was still
    pending, `flushEnd` could call `serializer.flush()` before `doShell()` had
    written the root `_assets` module map, causing seroval to silently drop the
    writes and client hydration to fail with "module was not preloaded". Root
    asset serialization is now memoized and gated on both paths.
  - Type formatting cleanup in `jsx-properties.d.ts`.
