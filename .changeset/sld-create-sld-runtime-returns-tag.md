---
"sld-dom-expressions": patch
---

`createSLDRuntime(runtime)` now returns a ready-to-use tag directly (with an empty component registry) instead of a factory that needs a second call. Components are registered via `.define({ ... })` on the returned tag, which already existed for derivation. This removes the awkward `createSLDRuntime(r)({})` for the no-components case and makes the runtime-binding step single-purpose.

Migration:

```ts
// before
const sld = createSLDRuntime(runtime)({ For, Show });

// after
const sld = createSLDRuntime(runtime).define({ For, Show });

// no components case
const sld = createSLDRuntime(runtime);
```
