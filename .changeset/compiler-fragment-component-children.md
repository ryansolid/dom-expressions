---
"@dom-expressions/compiler": patch
---

Support JSX fragments as component children in dom and universal modes. `<Comp><>...</></Comp>` previously failed with "Only text and expression component children are implemented in the AST-native milestone" in dom mode (while babel and ssr accepted it); fragments now lower through the shared fragment path and are hosted in a `children` getter like element children, matching Babel for sole fragments, fragments mixed with siblings, nested/empty fragments, dynamic and conditional fragment content, and keyed components. Single element/fragment children that lower to a setup IIFE now inline their body into the getter across dom, ssr, and universal modes (Babel's zero-arg callee unwrap), and ssr fragment children keep their `memo` wrapper instead of unwrapping it into the getter body.
