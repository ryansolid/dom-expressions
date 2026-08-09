---
"@dom-expressions/runtime": patch
---

Streaming SSR retry robustness (SSR stack-overflow diagnosis amplifiers). `buildAsyncWrap` now brands its owner-restoring retry wrapper and reuses it when a hole suspends again, instead of nesting one `runWithOwner` closure per retry pass — a hole that re-suspended N times used to cost O(N) stack frames per invocation and O(N²) over the render, and a long re-suspension chain overflowed the stack. And real (non-NotReady) errors surfacing in retry passes are now contained: the three flush loops catch them and route through a new `failRender` (report via `onError`, wind the render down like a disconnect), and the same channel is exposed to the reactive library's boundary resume loop as the internal `context.failRender` seam — a failed render pass fails the REQUEST, not the host process (previously the throw escaped the flush microtask as an unhandled rejection).
