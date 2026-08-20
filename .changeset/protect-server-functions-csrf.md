---
"@dom-expressions/runtime": patch
---

Protect HTTP server function calls against cross-origin requests by default. Configure the expected public origin through `csrf`, or disable the check when another trusted layer protects the endpoint.
