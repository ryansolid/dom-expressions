---
"@dom-expressions/runtime": patch
---

Deduplicate the `DOMElements` set literal: the array concatenated a categorized list with a full alphabetical list, shipping 286 entries where only 149 are unique — ~1 KB minified in any bundle that retains the set. Membership is byte-for-byte identical (consumers only do `.has()` checks); tree-shaken apps that never touch it still drop it entirely via the existing `/*#__PURE__*/` annotation, so this pays off for star-import, CDN, and non-tree-shaken consumers.
