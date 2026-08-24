---
"@dom-expressions/compiler": patch
---

Reconcile the semantic-trace census with DOM lowering over discarded child
lists, so tracing stops failing files whose child list a lowering path drops.
A void element in nested native-child position keeps its children through
lowering and now censuses them; a void element that is its own template root
still discards them and claims nothing; a `children` attribute on a void
element stays an attribute site; a nested element whose dynamic `textContent`
replaces its content retracts the children it drops; the textarea `value` fold
retracts the source children it replaces on all three paths that perform it,
while its synthesized replacement child claims no site of its own; and an inert
`<noscript>` on the static-template fast path retracts the children it never
visits. One known shape still fails reconciliation deliberately — a `children`
attribute on a nested non-void element with no source children, where this
fork emits nothing and the parity target inserts — because that failure is
the divergence's only detection signal. (The promotion itself is fixed
separately, which retires that failure.) `transform()` output is unchanged.
