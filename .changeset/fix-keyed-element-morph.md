---
"dom-expressions": patch
---

Keyed element matching in the frame morph: server markup can carry entity identity as `data-key`, and the morph matches keyed elements by key instead of by position. Live element state the morph deliberately preserves — `value`/`checked` properties, `open` on `<details>`, focus — now follows the entity across reordering morphs instead of latching to its old position (previously, a keyed list reorder silently reattributed user state to whatever entity landed at that position). Sibling-scoped, matching client `For` semantics; unkeyed elements keep positional matching unchanged.
