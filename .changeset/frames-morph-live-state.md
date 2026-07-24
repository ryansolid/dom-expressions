---
"@dom-expressions/runtime": patch
---

Preserve browser-owned live state across a frame morph. The morph makes server-owned attributes match the streamed output exactly, which would reset a user-toggled `<details open>` / `<dialog open>` on every navigation (the `open` attribute *is* the toggle, unlike form `value`/`checked`, which are properties that decouple from their attributes after input and so already survive an attribute-only morph). `open` on `<details>`/`<dialog>` is now preserved — never removed, never set by the morph. Adds a `data-preserve` escape hatch: an element marked with it keeps its live attributes and subtree untouched by the morph, for server DOM a third-party widget (rich editor, chart) has taken over or any state the deny-list can't name. Regression-tested in `frame-client.spec.js`. Morph slice 873 → 945 gz (still ~360 under micromorph); frames consumer re-guarded 6180 → 6250.
