---
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
---

Treat a native `children` attribute as child content — template-inlined when static, inserted when dynamic — instead of writing the read-only DOM `children` property. Explicit JSX children still win; named `children` versus a spread keeps source order.
