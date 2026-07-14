---
"@dom-expressions/runtime": patch
---

Route `renderToStream`'s emission through semantic sink methods (`sink.data`, `sink.fragment`, `sink.reveal`, `sink.asset`, `sink.shell`) as the FrameSink extraction seams. The document sink remains the default and reproduces the existing inline `<script>`/`<template>`/`<link>` emission byte-for-byte; an experimental `options.sink` allows overriding individual sink methods.

Add the experimental frame producer on top of the seams: `createFrameSink` and `renderToFrameStream` (`src/frame-sink.js`, not in the public export surface) render through the same core and emit the transport-agnostic FrameChunk stream (`start`/`assets`/`html`/`data`/`fragment`/`reveal`/`complete`) instead of a document.

Add the experimental client frame runtime (`src/frame-client.js`, not in the public export surface): a resident keyed record store applying frame chunks into a DOM boundary — version-as-stale-guard, fragment placeholder ranges with reveal readiness buffering and fallback materialization, a projection-preserving server-owned morph, the slot model (direct-insert + render-function callbacks, iteration, threaded resolution), and a chunk-routing host with out-of-order buffering.
