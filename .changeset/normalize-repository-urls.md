---
"babel-plugin-jsx-dom-expressions": patch
"dom-expressions": patch
"hyper-dom-expressions": patch
"lit-dom-expressions": patch
"sld-dom-expressions": patch
---

Normalize the `repository` field in every package to the standard npm
convention: a `git+https://github.com/ryansolid/dom-expressions.git` URL
with a `directory` pointing at the package within the monorepo. Restores
"View source" / "Open in repo" links on the npm registry and unblocks
tooling that resolves source from package metadata.
