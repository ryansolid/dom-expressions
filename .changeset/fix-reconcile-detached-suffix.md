---
"@dom-expressions/runtime": patch
---

Fix `reconcileArrays` dropping a node on some reorderings (e.g. `<For>` lists). After a replace plus the single-anchor end-swap, a detached node could still match as a common suffix and never be re-inserted. DOM and universal prefix/suffix now require the node to still belong to this parent.
