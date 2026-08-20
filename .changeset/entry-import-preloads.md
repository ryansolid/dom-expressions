---
"@dom-expressions/runtime": patch
---

Preload the client entry's static JavaScript imports during server rendering, alongside its existing CSS graph. The runtime now emits `modulepreload` links for static imports so the browser can fetch them in parallel. The entry itself is still loaded by the document's module script, while dynamic imports remain demand-driven.
