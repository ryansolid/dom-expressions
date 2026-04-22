---
"babel-plugin-jsx-dom-expressions": patch
"dom-expressions": patch
"hyper-dom-expressions": patch
"lit-dom-expressions": patch
---

Fix a SyntaxError when an element has 222+ merged dynamic attributes
(solidjs/solid#2682). The internal identifier generator produced `in` at
index 221, and since these identifiers are emitted as object shorthand
destructuring bindings, the resulting `({ …, in }) => …` could not be parsed.
`getNumberedId` now shifts past any natural index that would encode to a JS
reserved word, keeping the mapping injective and the output at 2 characters
for all practical dynamic counts.
