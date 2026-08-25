---
"@dom-expressions/compiler": patch
---

Add the DOM compiler's semantic-trace producer contract, including additive
wrapper, component-render, and deferred-callback facts, while preserving
transform output byte-for-byte. Version 2 is strict about unknown fields and
uses the same source span for execution sites and wrapper facts, so the
consumer can map unaudited wrapper identities to `Unknown`.
