---
"@dom-expressions/compiler": patch
---

Fix cross-mode dynamic-classification divergences from the Babel plugin by routing every generate through one shared classifier: the dom and universal generates now honor the namespace-import member carve-out (`import * as ns` member accesses classify as static, including computed members with static keys), `/*@static*/` markers are respected in dom fragment children, component children, and condition branches (and are leading-only everywhere, matching Babel's `leadingComments` check), fragment and element spread children (`<>{...items()}</>`) now compile with Babel's semantics in all modes instead of erroring in dom and silently losing reactivity in universal, and JSX inside a component spread argument no longer classifies as dynamic in universal mode (which previously produced a spurious `mergeProps` thunk).
