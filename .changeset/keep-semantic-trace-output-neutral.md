---
"@dom-expressions/compiler": patch
---

Keep semantic tracing observational on the `next` compiler: restore upstream
native `children`, `textContent`, root-slot, and nested owner-context output
while recording discarded or elided source sites without changing generated
code.
