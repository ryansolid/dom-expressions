---
"@dom-expressions/runtime": patch
---

The document face gets the value tier's inline half (DR-2, t=0 — where the server is the consumer). An async value passed whole as a slot arg used to reach the inline fill RAW during document SSR: nothing suspended, the t=0 markup shipped an empty hole where the settled value belongs, and the adopted client — which settles correctly from the record — contradicted the page bytes (a hydration mismatch instead of a covered pending read). The document slot props now wrap async-valued args so the fill's read suspends: the read throws not-ready through rxcore's new `ssrAsyncValue` into the engine's hole machinery, the covering boundary holds, and the re-pull delivers the settled value in markup — finer than the not-ready thunk case's whole-section defer, since the throw happens in the fill's own hole. The record is untouched: the async value itself still ships there, its resolution streaming through the document's data scripts.

Async iterables have one cursor and two consumers, so they tap: the inline read settles on the FIRST yield (markup is the V1 snapshot; later yields belong to the adopted client) and the record ships a replay wrapper that re-yields it before delegating, so the client still receives the complete sequence.

Cores without `ssrAsyncValue` fall back to the previous raw-value behavior.
