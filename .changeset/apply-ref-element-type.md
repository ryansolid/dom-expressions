---
"@dom-expressions/runtime": patch
---

Make `applyRef` generic so callbacks typed for a concrete element (e.g. `HTMLInputElement`) type-check when forwarding `props.ref`.
