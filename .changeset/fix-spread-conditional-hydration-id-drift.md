---
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
---

Fix hydration id drift from asymmetric condition memos (#2959)

Two positions emitted a condition memo on one generate but not the other,
so the client consumed hydration ids the server never allocated and every
id after the conditional drifted (unclaimed `<For>` rows, mismatched
serialized async lookups):

- Element spread conditional attributes: the dom generate memo-wrapped
  `{...spread} attr={cond ? a : b}` getters while ssr emitted the bare
  expression. The memo is now dropped on the dom side — attribute values
  are primitives and the spread assign pass already dedupes writes against
  previous values, so the memo only added per-read churn. The universal
  generate keeps its memo: no hydration ids exist there and
  custom-renderer prop values can be arbitrarily expensive.
- Component conditional props: the dom generate memo-wrapped
  `<Comp prop={cond ? a : b} />` getters while ssr emitted the bare
  expression. The memo is now emitted on the ssr side too — the server
  sync memo allocates an owner id exactly like the client's, and the wrap
  keeps its truthiness insulation (prop values can be expensive). Matches
  the children-conditional wrap, which was already symmetric.

Both fixes land identically in the Babel plugin and the Rust compiler.
