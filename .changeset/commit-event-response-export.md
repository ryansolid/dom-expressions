---
"@dom-expressions/runtime": patch
---

The server-function handler's commit seam is now the public `commitEventResponse(response, event?)` on the server entry — handler-lifecycle plumbing, the second of a handler's two exits: page results leave through `createSSRResponse`, any other `Response` (a middleware early return, an API result) leaves through `commitEventResponse`; application middleware never calls it. Folds the event's response stub onto the outgoing response with the seam's exact rules — `Set-Cookie` appends entry-by-entry, other stub headers gap-fill only (never the wire-protocol family the handlers own, never `Content-Type`/`Content-Length` on a bodiless response), the status is never taken from the stub — then commits the stub so later writes fail loudly. `event` defaults to the ambient `getRequestEvent()`.

New relative to the private seam: an already-committed stub passes the response through untouched, making the fold idempotent at handler edges — a handler applies it unconditionally after its middleware chain unwinds, and a page response that already went through `createSSRResponse` does not double-fold its cookies. One implementation, moved to server.js and imported by the server-function handler, so the public API and the handler's own responses cannot drift.
