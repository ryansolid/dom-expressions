---
"@dom-expressions/compiler": patch
---

Match Babel DOM output by preserving forced `prop:` writes through spreads, respecting spread precedence over earlier `children` attributes, and discarding children of HTML void elements.
