---
"@dom-expressions/compiler": patch
---

Promote a `children` attribute on a nested native element to a child insert, as
the Babel plugin does and as this compiler already did for a template root.
`<div><span children={content()} /></div>` emitted nothing at all; it now emits
`insert(_el$2, content)`. Only nested native-child position changes — every
shape that already matched the Babel plugin still does: source children shadow
the attribute, a void element's `children` attribute is never promoted, a spread
keeps `children` in the merged props, and a value the constant fold resolves
stays a `children` property write. Babel's single `children` slot is honored, so
a dynamic `textContent` after the attribute still takes the element's content
(and one before it now loses to the attribute, both matching Babel), a
literally-spelled textarea `value` still wins outright (a constant-foldable but
non-literal-spelled `value`, e.g. `value={"a" + "b"}`, is a separate
pre-existing divergence — see docs/execution-contract.md divergence 9), and a
`<noscript>`'s children are still dropped. Selection also now matches Babel's
own attribute dedup: it picks the *last attribute named* `children` first, then
judges that one attribute's literal-ness, so a trailing literal duplicate
(`<span children={x()} children={"s"}/>`) blocks promotion instead of falling
back to an earlier non-literal `children` the dedup already discarded — this
fixes both the new nested call site and the same latent bug at the template
root. With `semanticTrace`, the shape reconciles instead of failing: the value
is reported as `jsx-child`/`reactive-rerun`, and a capture the slot's winner
discards as `jsx-child`/`elided`.
