---
"@dom-expressions/runtime": patch
---

Pass the revealed fragment's parent to the `_$HY.fe` reveal hook: `$df` now calls `_$HY.fe(id, parent)`. The hook already fired on every swap but carried only the fragment id, so a consumer that needs to look at what just landed — server-component boundaries adopt their element there — had no choice but to rescan the document. The parent scopes that work to the fragment that just arrived. Purely additive: the emitted stub ignores the argument, and consumers that only read the id are unaffected.
