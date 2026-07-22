---
"@dom-expressions/runtime": patch
---

Relax server-side method enforcement: declaring `GET` grants GET dispatch without revoking the default POST transport. A GET-declared function now accepts both methods — necessary because routers auto-declare GET on query-wrapped functions that may also be called directly over POST. The security-relevant direction is unchanged: GET requests to functions that never declared it still answer 405.
