---
"@dom-expressions/runtime": patch
---

Hold the streaming shell for `deferStream` reads whose boundary mounts behind a root-level async hole (solidjs/solid#3047 — the code-split lazy route shape). The shell attempt runs inside the previous `allSettled(blockingPromises)` continuation, and a hole that completes by mounting content can register NEW blockers as it renders (a deferStream read under the just-created boundary adds its source promise via `serialize()`); those were never re-awaited, so the shell flushed with the boundary's fallback and the content streamed later. `doShell()` (and the thenable consumer's completion gate) now bail when hole resolution grows the blocking set, letting the flush loop re-await the grown set — the boundary's pre-flush `replace()` then splices the resolved content into the held shell.
