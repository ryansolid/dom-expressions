---
"@dom-expressions/runtime": patch
---

Behavior claims: reconcile-inserted subtrees and live-hole re-emissions sweep `_bnd` markers unconditionally — the claim callback no longer nulls out when no nav-claim consumer is registered (the sweep self-gates each half), so refs re-fire on morph-replaced elements and event props inside streaming holes stay wired.
