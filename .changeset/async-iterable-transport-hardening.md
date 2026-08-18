---
"@dom-expressions/runtime": patch
---

Failure and teardown wiring for async-iterable server function results

The raw stream path now has a full lifecycle instead of only a happy path:

- **Server teardown**: the response codec stream (now `serializeResponseStream`, server-only) ties itself to `request.signal` and the `ReadableStream` cancel hook — a client that disconnects mid-stream stops pending serialization and closes a top-level async-iterable result's iterator, so generator `finally` blocks run instead of the server pumping a stream nobody reads.
- **Client failure sweep**: a dropped, truncated, or malformed response body now rejects every value still waiting on later chunks (pending promises and open streams in the deserializer's shared refs) instead of hanging them forever; the drain rejection itself is no longer unhandled.
- **`return()` ends the call**: a streamed result's iterator (`break` in `for await`) aborts the underlying fetch via a call-owned AbortController (minted only when the caller brought no signal), which stops the download and fires `request.signal` on the server.
- **Negotiation fix**: `isJSONSafe` answers false for plain objects carrying `Symbol.asyncIterator`/`Symbol.iterator` — stringify would ship `{}` and silently drop the stream.
