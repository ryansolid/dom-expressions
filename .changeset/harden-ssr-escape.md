---
"babel-plugin-jsx-dom-expressions": patch
"dom-expressions": patch
---

Fix SSR escaping gaps reachable from JSX, and tighten the compiler so
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
