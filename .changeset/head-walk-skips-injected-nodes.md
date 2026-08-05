---
"@dom-expressions/runtime": patch
---

Hydration walks inside `<head>` skip foreign injected nodes. `<head>` is the tool-injection zone — vite prepends its dev client script, HMR inserts styles, extensions add scripts the server never rendered — and the strictly positional claim adopted the first foreign node as the component's element, drifting every subsequent sibling claim by one (metas claimed as title, title as link) along with insert anchors computed off the walked nodes. With the expected tag in hand, `getFirstChild`/`getNextSibling` now scan forward to the first matching element — head only; body walks stay strict so genuine structure mismatches keep warning.
