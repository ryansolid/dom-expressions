---
"@dom-expressions/compiler": patch
---

Match Babel when a nested native element combines dynamic `textContent` with an existing child list. The children now lower normally and the text-content effect targets their first node; a synthesized placeholder is emitted only when the element has no children.
