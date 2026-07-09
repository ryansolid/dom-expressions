---
"@dom-expressions/runtime": patch
---

Route `renderToStream`'s emission through semantic sink methods (`sink.data`, `sink.fragment`, `sink.reveal`, `sink.asset`, `sink.shell`) as the FrameSink extraction seams. The document sink remains the default and reproduces the existing inline `<script>`/`<template>`/`<link>` emission byte-for-byte; an experimental `options.sink` allows overriding individual sink methods (surface grows as further seams extract).
