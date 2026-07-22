---
"@dom-expressions/compiler": patch
---

Rewrite the native compiler's DOM attribute pipeline to match the Babel plugin's output:

- Dynamic attribute bindings across a whole template root now batch into a single `effect()` with a previous-values object, instead of one effect per attribute.
- Stateful DOM properties (`input.value`/`checked`, `select.value`, `option.value`/`selected`, `video`/`audio` `muted`, and their `default*` forms) compile to inlined attributes when static and `prop:` property writes when dynamic, including the `<select value>` `queueMicrotask` race guard and the input/textarea nullish-value fallback.
- Class and style attributes go through the full preprocessing pipeline: static styles merge into the template, style objects split into `setStyleProperty()` calls, class arrays and fixed-shape class objects split into static classes and `classList.toggle()` bindings, and duplicate attributes dedupe last-wins.
- Dynamic `textContent` writes to a dedicated placeholder text node's `data` instead of assigning `textContent`.
- Refs follow the Babel branch order (constant bindings call `ref()` directly; lvalues get the callable-check with assignment fallback), and delegated event handler groups emit as flat statements ahead of other element expressions.
- Confident compile-time evaluation folds template literals, arithmetic, logical/conditional expressions, and static bindings into literals, matching Babel's `path.evaluate()` usage.
