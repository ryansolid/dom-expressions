---
"@dom-expressions/runtime": patch
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
---

Keyed element matching in the frame morph: `$key` on an intrinsic element in server JSX compiles to a `_key` attribute (SSR-only — DOM compiles strip it, components pass it through as slot identity), and the morph matches keyed elements by key instead of by position. Live element state the morph deliberately preserves — `value`/`checked` properties, `open` on `<details>`, focus — now follows the entity across reordering morphs instead of latching to its old position (previously, a keyed list reorder silently reattributed user state to whatever entity landed at that position). Sibling-scoped, matching client `For` semantics; unkeyed elements keep positional matching unchanged.
