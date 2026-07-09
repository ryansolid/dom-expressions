---
"@dom-expressions/runtime": patch
---

Route `renderToStream`'s serializer output through a semantic sink method (`sink.data`) as the first FrameSink extraction seam. The document sink remains the default and reproduces the existing inline `<script>` emission byte-for-byte; an experimental `options.sink` allows overriding individual sink methods (surface grows as further seams extract).
