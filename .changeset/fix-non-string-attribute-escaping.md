---
"@dom-expressions/runtime": patch
---

Escape SSR attribute values after coercing arrays, objects, numbers, and other non-string values to strings. This prevents quotes produced during coercion from breaking out of native attributes while preserving nullish and boolean attribute handling.
