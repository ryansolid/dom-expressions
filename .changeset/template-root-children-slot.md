---
"@dom-expressions/compiler": patch
---

Match Babel's template-root ordering when a native `children` attribute precedes dynamic `textContent`; the later text-content writer now replaces the earlier child capture. Keep semantic tracing total for promoted static strings and nested promoted values after the upstream native-children change.
