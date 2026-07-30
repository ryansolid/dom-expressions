---
"@dom-expressions/runtime": patch
---

Add a lazy, cached `readable` getter to the `renderToStream` result — a `ReadableStream<Uint8Array>` view of the render for web-standard responses: `new Response(renderToStream(fn).readable)`. First access creates an internal `TransformStream` and starts piping into its writable side (deliberately not awaited — the pipe settles only after the whole render is written, and nothing drains the readable until it is handed back); the readable side is cached so repeated access returns the same stream. Chunks are UTF-8 encoded bytes, exactly what `pipeTo` writes. Like `pipe`/`pipeTo`, accessing `readable` consumes the render — the result tracks which consumer claimed it, and mixing distinct consumers (`readable` then `pipe`/`pipeTo`, or the reverse) throws a deterministic error naming the conflict.
