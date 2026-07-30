---
"@dom-expressions/runtime": patch
---

`renderToStream(...).pipeTo(w)` now awaits in-flight writes before releasing the writer and closing. `buffer.write` issued `writer.write()` without awaiting the returned promise, and `writable.end()` then called `writer.releaseLock()` synchronously, so whether a chunk still in flight survived was left to the host's stream implementation — Node queues it anyway, workerd drops it. The chunk at risk is always the last one written, which for a streamed `<Loading>` boundary is its `<id>_fr` resolution script. Losing that leaves the client's boundary waiting on a promise that never resolves: it renders its fallback into detached DOM, the server's streamed content is never claimed, and every binding inside the boundary is dead after hydration — including plain signals with no async involvement, and with no error anywhere.
