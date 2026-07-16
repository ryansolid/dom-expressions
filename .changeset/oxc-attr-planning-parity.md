---
"@dom-expressions/compiler": patch
---

Port the Babel plugin's attribute preprocessing pipeline to the native compiler and share it across DOM, SSR, and universal outputs. Attribute handling now matches babel-plugin-jsx: duplicate attributes deduplicate to the last value, multiple `class` attributes merge, static `style`/`classList` objects split and fold into the template, confidently-evaluable expressions (including conditionals and logicals over known constants) inline as static attribute text, dynamic attribute updates batch into a single effect with previous-value tracking, and `textarea` `value` folds into element children where Babel does. SSR output gains the same planning: `textContent`/`innerHTML` become element children instead of literal attributes, reserved namespaces (`prop:`, `on*`, `use:`, `bool:`, etc.) are handled consistently, and hydratable `textContent` gets the `|| " "` guard.
