---
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
"@dom-expressions/runtime": patch
---

Universal JSX now passes compile-time static host props to `createElement(tag, staticProps)` so custom renderers can configure nodes before children are inserted. Dynamic props and elements with spreads continue to use the existing `setProp` / `spread` paths.
