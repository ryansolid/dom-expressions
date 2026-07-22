---
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
---

Fix omitLastClosingTag corrupting templates when per-slot insertion markers follow the last static element. An element trailed by two or more dynamic slots now keeps its closing tag, so the trailing `<!>` placeholders parse as its siblings instead of being swallowed as children of the still-open element (which crashed the template walk with "Cannot read properties of null (reading 'nextSibling')").
