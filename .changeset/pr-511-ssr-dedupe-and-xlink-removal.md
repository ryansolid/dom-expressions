---
"babel-plugin-jsx-dom-expressions": patch
"dom-expressions": patch
"hyper-dom-expressions": patch
"lit-dom-expressions": patch
---

- SSR: Duplicate attributes in JSX without spreads are now deduplicated —
  `<div class="a" class="b" />` correctly renders as `<div class="b" />`
  (last-wins), matching client behavior. Previously the compiler kept both
  attributes in the output.
- Client: `setAttributeNS` / `removeAttributeNS` now use matching names when
  clearing namespaced attributes (e.g. `xlink:href`). Previously removal could
  leave the attribute in place because it used the local name while the set
  used the qualified name.
- Expanded test coverage across all four packages; no other behavior changes.
