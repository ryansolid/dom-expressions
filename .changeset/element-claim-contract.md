---
"@dom-expressions/runtime": patch
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
---

Element-claim contract for navigation-relevant elements (Wave B, dormant):

- New runtime hooks in the client module: `registerElementClaim(handler)`
  subscribes a consumer (returns an unregister function) and
  `claimElement(node)` invokes registered handlers. With no consumer
  registered every emitted claim is a null check — apps without a routing
  integration pay effectively nothing. The server module exports silent
  no-ops so consumers can register isomorphically.
- Compiled DOM output (both the Rust compiler and the Babel plugin) now
  claims `a[href]` and `form[action]` elements at creation — including under
  spreads, where the tag is still statically known. Previously reference-free
  static anchors gain a positional walk so the claim call has a target.
- Compiler-owned writes to `href`/`action` (binding effects and spread
  assigns, which both land in the runtime's `setAttribute`) re-invoke the
  registered handlers, so a consumer's per-element state stays fresh with no
  observers; handlers must be idempotent.

This is groundwork for router integrations (e.g. link active/pending state
on plain `<a>` elements without a wrapper component); behavior is inert
until a consumer registers.
