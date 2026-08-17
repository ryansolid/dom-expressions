---
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
---

SSR now HTML-escapes the static parts of template literals used as
attribute and style values, so quotes in expressions like
`` url("${src}") `` stay inside the attribute.
