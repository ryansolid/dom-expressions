# dom-expressions

## 0.50.0-next.3

### Patch Changes

- 816870a: Export `VoidElements` and `RawTextElements` from the runtime constants. These are the standard HTML void-element and raw-text-element sets used by HTML parsers, exposed so downstream tagged-template runtimes (e.g. `sld-dom-expressions`) can consume them without redefining the lists.
- 4dae801: Normalize the `repository` field in every package to the standard npm
  convention: a `git+https://github.com/ryansolid/dom-expressions.git` URL
  with a `directory` pointing at the package within the monorepo. Restores
  "View source" / "Open in repo" links on the npm registry and unblocks
  tooling that resolves source from package metadata.

## 0.50.0-next.2

### Patch Changes

- d9b571c: Replace the `memo(accessor, true)` wrap in `insert()` with a conditionally
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

- 39c207c: Fix a SyntaxError when an element has 222+ merged dynamic attributes
  (solidjs/solid#2682). The internal identifier generator produced `in` at
  index 221, and since these identifiers are emitted as object shorthand
  destructuring bindings, the resulting `({ …, in }) => …` could not be parsed.
  `getNumberedId` now shifts past any natural index that would encode to a JS
  reserved word, keeping the mapping injective and the output at 2 characters
  for all practical dynamic counts.
- 03da8a5: Fix SSR escaping gaps reachable from JSX, and tighten the compiler so
  redundant runtime `escape` calls drop out of the output.

  Security fixes:
  - `ssrStyle` and `ssrClassName` now attribute-escape object keys, not
    just values. Previously a user-controlled key in `<div style={{…}} />`
    or `<div class={{…}} />` could break out of the surrounding attribute.
  - Dynamic fragment-child expressions (`<>{state.text}</>`) now compile
    to `_$memo(() => _$escape(expr))`. Element-child expressions already
    escaped via `escapeExpression`; fragment children reached SSR through
    a separate path and were concatenated raw.
  - Computed-key object styles (`style={{ [k]: v }}`) escape the key at
    compile time.

  Compiler alignment:
  - SSR now matches DOM in rejecting fragments placed directly inside an
    element: `<div><>…</></div>` is a compile error in both renderers.
    Fragments reached via conditionals (`<div>{cond && <>…</>}</div>`)
    remain legal.

  Compiler optimizations:
  - `escapeExpression` drops the outer `_$escape` wrap on a `JSXFragment`
    when its single significant child is either a dynamic expression
    (compiles to a memoized accessor function, `escape(fn)` is a no-op)
    or a native element (compiles to an `_$ssr(…)` SSR node object,
    `escape(object)` is a no-op). This turns
    `cond && _$escape(_$memo(() => _$escape(state.text)))` into
    `cond && _$memo(() => _$escape(state.text))`, and
    `cond && _$escape(_$ssr(_tmpl$N))` into `cond && _$ssr(_tmpl$N)`.

  SSR fixtures for `components`, `conditionalExpressions`, `fragments`,
  and `attributeExpressions` regenerate. Each security fix has a JSX
  round-trip test in `packages/dom-expressions/test/ssr/jsx.spec.jsx`
  that feeds hostile input through `renderToString`.

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
