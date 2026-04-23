---
"babel-plugin-jsx-dom-expressions": patch
---

Fix single-dynamic attribute accessors being silently invoked with the
previous value. Given `<div style={source()} />`, the compiler previously
emitted `effect(source, (v, p) => style(el, v, p))`, which causes the
reactive core to call `source(p)` — leaking `prev` into a user-authored
accessor that the source expression wrote as a zero-arg call. Polymorphic
accessors (e.g. atom-style signals) would observe an unexpected argument
and misbehave.

The compute position now emits `() => source()` so the user's call shape
is preserved. The prior optimization of unwrapping an IIFE
(`(() => x)()` → `() => x`) is retained since IIFEs are zero-arg and
cannot leak `prev`.

Fixes #510.
