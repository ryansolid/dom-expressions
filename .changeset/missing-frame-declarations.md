---
"@dom-expressions/runtime": patch
---

Type declarations catch up with shipped exports: `adoptFrameRange`
(frame-client) and `createChunk`/`ChunkReader` (server-functions/shared)
are now declared — TypeScript consumers of the frames adoption path and
the shared wire framing no longer hit TS2305. Declaration-only; no runtime
changes.
