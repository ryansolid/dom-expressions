---
"@dom-expressions/compiler": patch
---

Fix native JSX compiler output for delegated member-expression event handlers so emitted `addEvent(..., true)` calls are paired with `delegateEvents([...])` registration.
