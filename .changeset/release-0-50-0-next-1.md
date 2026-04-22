---
"babel-plugin-jsx-dom-expressions": patch
"dom-expressions": patch
"hyper-dom-expressions": patch
"lit-dom-expressions": patch
---

- `insert()` accepts an optional 5th `options` argument that is forwarded to the
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
