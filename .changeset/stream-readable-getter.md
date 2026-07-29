---
"@dom-expressions/runtime": patch
---

Add a lazy, cached `readable` getter to the `renderToStream` result — a `ReadableStream<Uint8Array>` view of the render for web-standard responses: `new Response(renderToStream(fn).readable)`. First access creates an internal `TransformStream` and starts `pipeTo` into its writable side (deliberately not awaited — `pipeTo` settles only after the whole render is written, and nothing drains the readable until it is handed back); the readable side is cached so repeated access returns the same stream. Chunks are UTF-8 encoded bytes, exactly what `pipeTo` writes. Like `pipe`/`pipeTo`, accessing `readable` consumes the render — use exactly one of the three.
