---
"@dom-expressions/runtime": patch
---

Container traces cross the slot border as RAW seroval streams instead of async iterables. Seroval decodes an async iterable as a generator wrapper over its internal stream, putting every buffered value at least a microtask away — but hydration's claim walk is synchronous, so a trace snapshot the document had already delivered still read as pending and the consuming boundary hydrated a phantom fallback over settled markup (the chat welcome/status meter miss). A raw stream decodes as the stream object itself, whose `.on()` replays the buffer synchronously. The mint is installed from `serializer-decode.js` (which already carries seroval; the plugin module stays seroval-free for the eager frames graph), `isContainerTraceMarker` accepts both wire shapes, and payloads from older serializers still take the async-iterable path.
