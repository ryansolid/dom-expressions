---
"@dom-expressions/runtime": patch
---

Route `renderToStream`'s emission through semantic sink methods (`sink.data`, `sink.fragment`, `sink.reveal`, `sink.asset`, `sink.shell`) as the FrameSink extraction seams. The document sink remains the default and reproduces the existing inline `<script>`/`<template>`/`<link>` emission byte-for-byte; an experimental `options.sink` allows overriding individual sink methods.

Add the experimental frame producer on top of the seams: `createFrameSink` and `renderToFrameStream` (`src/frame-sink.js`, not in the public export surface) render through the same core and emit the transport-agnostic FrameChunk stream (`start`/`assets`/`html`/`data`/`fragment`/`reveal`/`complete`) instead of a document.
