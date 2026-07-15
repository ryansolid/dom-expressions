---
"@dom-expressions/runtime": patch
---

`RequestContext` is now a registered symbol (`Symbol.for("solid.RequestContext")`). The AsyncLocalStorage a request scope parks on `globalThis` must be found by every copy of the module — downstream, the core server entry and the server-functions entry bundle separately, each carrying a copy of the code that reads it.
