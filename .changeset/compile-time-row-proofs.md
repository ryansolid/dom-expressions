---
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/runtime": patch
---

Patch-mode list admission is now compile-time only: the plugin proves row purity per row function (single-param, one compiled template, no reactive or owned emissions, all dynamics in one patchDriver body registered on the row param itself) and wraps qualifying functions with the new `rowProof` runtime marker at program exit. The runtime purity probe is deleted — no speculative execution of user row code, no first-row sampling, no tentative empty-list engagement — and unstamped rows decline to the classic mapArray path before any DOM work. Extracted row functions now qualify at their definition site, which the runtime probe could never see.
