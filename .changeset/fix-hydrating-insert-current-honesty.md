---
"@dom-expressions/runtime": patch
---

Hydrating inserts keep `current` honest: a render whose nodes never entered the DOM (a boundary's client fallback while the range shows the server's settled content) no longer displaces the tracked range, so the settling insert reconciles against what the DOM actually holds instead of leaving the server's nodes behind as residue
