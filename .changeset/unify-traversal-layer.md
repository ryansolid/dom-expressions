---
"@dom-expressions/compiler": patch
---

Unify the compiler's traversal/classification layer across the dom, ssr, and universal generates, mirroring babel-plugin-jsx's shared architecture: one `Classify` authority owns dynamic classification, child filtering/counting, and static-marker handling, and single generic implementations of fragment lowering, component children, and the component prop loop replace the per-mode copies (mode dispatch remains only at emission). Guardrails added: a cross-mode fixture-union parity ratchet and a classification-trace harness asserting all generates answer every shared classification question identically.
