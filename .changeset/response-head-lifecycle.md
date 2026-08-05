---
"@dom-expressions/runtime": patch
---

HTTP response-head lifecycle and middleware composition for SSR handlers, plus a per-invocation wrap seam for server functions.

- `createRequestEvent(request, init?)` builds the canonical stub-backed request event (`request`, `locals`, a `ResponseStub` `response` the render's primitives write to).
- `createSSRResponse(result, event, options?)` derives the outgoing `Response` from a render result, freezing the head at shell flush: the stub commits there, a pre-flush `Location` becomes a real redirect (`getExpectedRedirectStatus`, also exported), and a post-flush `Location` appends a nonce-aware `<script>window.location=...</script>` fallback before the stream closes. `options.transformChunk` rewrites outgoing chunks.
- `composeMiddleware(middlewares)` composes fetch-style `(request, next) => Response` middleware; runs inside the caller's request scope so `getRequestEvent()` works as in application code, and nothing reaches the wire until the outermost middleware returns.
- `configureServerFunctionsServer({ wrapInvocation })` / `handleServerFunctionRequest(..., { wrapInvocation })`: wraps every server function execution (HTTP dispatch and direct SSR calls) with the invocation identity established — the seam for per-function middleware, auth, logging and error mapping.
