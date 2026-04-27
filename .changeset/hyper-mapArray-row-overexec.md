---
"hyper-dom-expressions": patch
---

Fix render-prop consumers re-mounting stable children on parent updates in hyperscript. `mapArray`-style helpers (`For`, `Index`, `Show`, etc.) and any third-party JSX-compiled component that re-invokes a callback prop with arguments store whatever the callback returns and re-flatten it on every parent change. With the lazy / tagged-thunk `h(...)` design, returning `h(Row, ...)` from such a callback would store a thunk — re-flattening would re-invoke it and re-run the row component, re-create its DOM, and fire its `onCleanup` even for rows the diff would have kept.

`h(...)` now materializes any tagged thunks that function props with arity ≥ 1 return — covering 1-arity render-callbacks (`children: row => h(Row, …)`, `header: tab => h(Tab, …)`), 2-arity `mapArray` row callbacks (`(item, index) => h(Row, …)`), event handlers, and higher-arity callbacks alike — so what the consumer stores is already the rendered tree, matching what JSX-compiled call sites produce. Behavior of zero-arity function props (`dynamicProperty` wrap) is unchanged. Arity (so consumers that introspect `cb.length`, e.g. `mapArray` deciding whether to allocate an index signal, see the original signature), `this`-binding when forwarded as a DOM event handler, and identity once the wrap is in place are all preserved. The wrap is idempotent across nested components.
