---
"@dom-expressions/runtime": patch
---

Reject server-function client calls when an unclaimed response has a 5xx status even if an intermediary omitted the protocol error header. Error-tagged and 5xx responses with no decoded body now reject with an `Error` naming the HTTP status instead of throwing or resolving `undefined`.
