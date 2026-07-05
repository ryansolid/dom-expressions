---
"@dom-expressions/runtime": patch
---

Fix style object updates so shared or constant style objects are not mutated while diffing, and nullish property values correctly remove the applied style.
