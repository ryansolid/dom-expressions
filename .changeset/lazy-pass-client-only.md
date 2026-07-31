---
"@dom-expressions/compiler": patch
---

Extend the `lazy()` module-URL pass (`transformLazy`) to also recognize `clientOnly(() => import("specifier"))` calls where `clientOnly` is a named import from `@solidjs/web`, so the server half can emit early modulepreload hints for browser-only modules. Because `clientOnly` takes an options bag in second position, the placeholder is appended as a third argument, padding the options slot with `void 0` when the call site omits it. Same placeholder format and plugin resolution contract as `lazy()`; already-annotated calls and other import sources are left untouched.
