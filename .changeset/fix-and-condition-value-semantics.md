---
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
---

Preserve JS value semantics for wrapped `&&` conditions (#532). The dom generate's condition wrap used to emit `memo(() => !!left)() && right`, collapsing every falsy left value to `false` — visibly wrong for component props (`undefined` became `false`, breaking `== null` checks) and a hydration mismatch against the untransformed server output (`{0 && <div/>}` rendered "0" on the server, nothing on the client). `left && right` is exactly `left ? right : left`, so the wrap now emits `memo(() => !!left)() ? right : left`: branching still keys off the memoized truthiness (truthy-value churn never re-creates the right side) while the alternate returns the raw left, matching the server for free. Statically boolean lefts (comparisons, `!x`) keep the plain `memo(() => left)() && right` form — the memo's value is the expression's value, so it's already exact with no second evaluation. Ported identically to the Rust compiler.
