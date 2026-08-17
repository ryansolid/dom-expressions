---
"@dom-expressions/runtime": patch
---

Warn in dev when the hydration walk misses a key: getNextElement healed a registry miss by silently creating a detached element, which reads as a frozen, non-interactive page with no signal (solidjs/solid#3000). The warning names the missed key and points at aligning id namespaces (NoHydration/Hydration or a matching renderId). Prod behavior unchanged.
