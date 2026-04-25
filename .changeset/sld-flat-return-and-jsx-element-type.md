---
"sld-dom-expressions": patch
---

Apply the single-node flatten uniformly so an `sld` template that resolves to one node/value returns it as a scalar (matching the existing behaviour of templateless paths). This lets downstream `insert` take the fast scalar path instead of reconciling a one-element array. The tag's return type is updated to `JSX.Element` to reflect the actual scalar-or-array shape; consumers that iterate or spread should normalize via `Array.isArray(result) ? result : [result]`.
