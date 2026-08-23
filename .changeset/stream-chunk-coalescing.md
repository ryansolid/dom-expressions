---
"@dom-expressions/runtime": patch
---

Coalesce streaming writes from the same resolution burst into one consumer chunk. A settled boundary emits its template, activation script, data script, and reveal as separate writes across chained microtasks — previously each became its own stream chunk and write syscall (41 chunks vs 11 for a 10-boundary page). Writes now buffer and flush on a macrotask boundary (after the burst's whole microtask chain), with the shell flushed synchronously at handoff (TTFB never deferred), end() flushing, and a 16KB early-flush for backpressure. Byte-identical output; the all-fast streaming scenario flips from 4x chunk overhead to beating the compiled baseline on shell, total, and renders/s.
