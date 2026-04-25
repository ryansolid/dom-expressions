---
"sld-dom-expressions": patch
---

Expose `Runtime`, `ComponentRegistry`, and `FunctionComponent` from the
package entry so consumers wiring a custom reactive core can type their
runtime object. Fix `Runtime.spread`'s `skipChildren` parameter type from
`Boolean` to `boolean`. Mark the package as `sideEffects: false` so
bundlers can tree-shake unused exports.
