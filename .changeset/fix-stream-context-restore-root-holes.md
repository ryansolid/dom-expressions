---
"@dom-expressions/runtime": patch
---

Restore a stream's render context before re-pulling pending root holes. An async root hole can resume after another render has replaced `sharedConfig.context` (module-global, shared across interleaved renders); re-pulling the hole first rendered the markup but silently dropped hydration records emitted during the retry — they serialized into the other render's completed context instead of the response that owns the resumed markup. (From #561.)
