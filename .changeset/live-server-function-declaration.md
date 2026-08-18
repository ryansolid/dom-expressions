---
"@dom-expressions/runtime": patch
---

`live()` server function declaration for value-shaped streams

Declares a server function returning an async iterable as a live source: successive yields are VALUES of one logical query, and the source re-yields current state on every connection. The declaration buys the wire-level lifecycle a raw stream doesn't have:

- **Client**: calls produce an iterable that survives the connection — on stream death it re-invokes with exponential backoff (reset per healthy value), first-connect failures reject like a normal call, completion completes, and `break` aborts the in-flight request. Live calls are reads: they never opt into single-flight enveloping (new neutral `read` request option). Wire state, if a UI wants it, rides an optional `onstatus` hook on the returned iterable — the side channel for the facts the retry loop deliberately erases from the value stream: `"connected"` on each successful (re)connect, `"reconnecting"` (with the error) on each post-connect death, `"closed"` when the source completes or the consumer ends it. First-connect failures emit nothing (the rejection is the channel).
- **Server**: the resolved iterable is branded with the registered `LIVE_SOURCE` symbol so faces meeting the value after it left the reference's hands (SSR policy) can detect it.

Both halves ship type declarations (`live` in the client and server server-functions entries).

Deliberately wire-level only — no keying, connection sharing, or value cache. Each iteration is its own connection, which keeps refresh honest (recompute = reconnect = the server re-yields current state) and gives a data layer a clean upstream: a router-level live query can hold one iteration open and multicast it, owning keying/replay-latest/refcounts channel-side. A live source has no revalidation (it self-updates through the open stream) and no single-flight story. All behavior lives inside the declaration and treeshakes with it: apps that never import `live` carry none of it. Composes with `GET` as `live(GET(fn))`.
