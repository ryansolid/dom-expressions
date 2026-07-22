---
"@dom-expressions/compiler": patch
---

Reach full output parity with babel-plugin-jsx across all modes. In dynamic (multi-renderer) mode, native elements belonging to another renderer are now routed to that renderer's transform instead of being templated as DOM (e.g. `<mesh>` inside a DOM subtree lowers through the universal renderer), DOM subtrees flatten their setup statements in statement position and single-child component getters, and shared wrapper helpers (`createComponent`, `mergeProps`, `applyRef`, `setProperty`) import once from the top-level module. JSX inside dynamic attribute values now lowers after the enclosing root completes, matching Babel's template registration order and effect getter wrapping. Dev hydratable mode fixes: intermediate element walks emit validated `getFirstChild`/`getNextSibling` lookups chained through walk variables, and nested elements no longer omit closing tags their position requires (e.g. `</li>` before a following sibling).
