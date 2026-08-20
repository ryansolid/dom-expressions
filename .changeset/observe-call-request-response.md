---
"@dom-expressions/runtime": patch
---

Name `observeServerFunctionCalls` payloads `request`/`response`, and export a no-op from the server entry so isomorphic `@solidjs/web/server-functions` imports resolve.
