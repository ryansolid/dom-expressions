---
"@dom-expressions/compiler": patch
---

A component (or spread child) boxed by static text now gets a dedicated `<!>` insertion marker in the dom generate, matching Babel's `wrappedByText` behavior. Without it the surrounding template texts merged into a single node during HTML parsing, so the following-sibling walk resolved to null and the inserted content landed after the trailing text (solidjs/solid#3004: `<p>(<Comp />)</p>` rendered `()…` with the component appended at the end).
