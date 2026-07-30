---
"@dom-expressions/runtime": patch
---

Client size pass on the frames runtime: the frame client's slot-range and placeholder discovery walk through shared bounded sibling walkers, dead range helpers are gone, and the server-function client entry re-exports the wire-layer framing/addressing utilities (`ChunkReader`, `createChunk`, `deserializeStream`, `frameAddress`, `REVALIDATE_HEADER`) so an integration's transport bundle can resolve them from the shared built instance instead of carrying a private copy.
