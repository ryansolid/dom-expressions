---
"@dom-expressions/compiler": patch
---

Fix semantic tracing for fragments returned from component-child callbacks and
IIFEs so valid JSX compiles without an uncensused `JsxChild` error.
