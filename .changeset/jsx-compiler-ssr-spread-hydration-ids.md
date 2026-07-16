---
"@dom-expressions/compiler": patch
---

Port the ssr spread-path hydration id fixes (#540) to the native compiler: dynamic children holes of spread elements (`<a {...props}>{children()}</a>`) are now scope-wrapped so they evaluate under their own owner scope, and hydratable spread props defer `mergeProps` behind a thunk so `ssrElement` allocates the element's hydration key before dynamic props run — previously every hydration id following the hole drifted, leaving siblings unclaimed.
