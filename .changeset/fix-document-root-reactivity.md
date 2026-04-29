---
"dom-expressions": patch
---

Fix document-root rendering so lazy memo-owned content remains reactive after `render(..., document)` or `hydrate(..., document)`. Full-document render paths now keep the root JSX tree observed without inserting into `document`, preventing nested content from going stale after later signal updates.
