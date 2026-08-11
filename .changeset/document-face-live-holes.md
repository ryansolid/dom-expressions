---
"@dom-expressions/runtime": patch
---

Live markup holes on the document face (Stage 4, producer half): the first inline server component arms one per-document engine — scope-gated to server-component render barriers, so plain document content keeps its exact bytes — and re-emissions ride ONE eagerly-serialized `sc:live` hydration record (a ReadableStream of hole/attr/error ops). The end latch runs before the serializer flush via a shared root-context carrier (`ctx.live`), so per-component context clones can arm without stranding the close hook — an armed document with deferred fragments previously never ended its response.
