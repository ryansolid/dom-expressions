---
"@dom-expressions/compiler": patch
---

Match Babel DOM output by preserving forced `prop:` writes through spreads, respecting spread precedence over earlier `children` attributes, discarding children of HTML void elements, and applying last-value-wins semantics after stateful DOM property aliases are normalized.
