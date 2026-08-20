---
"@dom-expressions/compiler": patch
---

SSR `serverComponents` option parity with the Babel plugin: ref/on* positions on intrinsic elements compile to one guarded `_$ssrClaim` hole per element (the `_bnd` behavior-claim marker) instead of dropping.
