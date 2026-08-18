---
"@dom-expressions/runtime": patch
---

`live()` server function declaration for value-shaped streams

Declares a server function returning an async iterable as a live source: successive yields are VALUES of one logical query, and the source re-yields current state on every connection. The declaration buys the wire-level lifecycle a raw stream doesn't have:

- **Client**: calls produce an iterable that survives the connection — on stream death it re-invokes with exponential backoff (reset per healthy value), first-connect failures reject like a normal call, completion completes, and `break` aborts the in-flight request. Live calls are reads: they never opt into single-flight enveloping (new neutral `read` request option).
- **Server**: the resolved iterable is branded with the registered `LIVE_SOURCE` symbol so faces meeting the value after it left the reference's hands (SSR policy) can detect it.

Deliberately wire-level only — no keying, connection sharing, or value cache. Each iteration is its own connection; sharing is the reactive graph's job (one memo consumes the stream, readers share its latest value — hoist the memo to share across the tree). Live is not a `query` layer and doesn't compose with one: a live source has no stale value to serve, no revalidation (it self-updates through the open stream), and no single-flight story. All behavior lives inside the declaration and treeshakes with it: apps that never import `live` carry none of it. Composes with `GET` as `live(GET(fn))`.
