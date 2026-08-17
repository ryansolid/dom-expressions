---
"@dom-expressions/runtime": patch
---

`isJSONSafe` no longer claims nesting that Node 24's `JSON.stringify` cannot deliver. The depth ceiling drops from 10000 to 4096 (Node 24 cliffs around 5900 nested objects on the default V8 stack; 8000 was measured on Node 26 and threw in CI). Those shapes still fall to the codec instead of a `RangeError` that dispatch would misread as the function failing.
