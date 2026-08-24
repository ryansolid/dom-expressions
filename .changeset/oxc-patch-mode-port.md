---
"@dom-expressions/compiler": minor
"@dom-expressions/babel-plugin-jsx": patch
---

The Oxc compiler ports patch-mode compilation and compile-time row proofs (DESIGN-PATCH-CHANNEL PR-C/§3c), closing the one-sided feature gap: eligible template scopes compile to `patchDriver` bodies and proven-pure row functions are wrapped with `rowProof`, byte-identical to the Babel plugin's emission (the parity harness no longer pins `patchDriver: false`). The subject guard resolves through the binding table (function params now declared; program-wide reassignment scan approximates Babel's `binding.constant`). The Babel plugin aligns its patch-body locals to the fixed `_n$`/`_p$`/`_f$`/`_v$` convention for cross-compiler parity.
