---
"@dom-expressions/tagged-jsx": patch
---

Emit element claims for static `a[href]` / `form[action]` in tagged templates. Static attributes are baked into the cached `<template>` at build time, so they never pass through the runtime `setAttribute` recheck that claims dynamically-written `href`/`action` — the element node is now stamped as a claim target when the static attribute is baked, and every clone is claimed via `claimElement` at render. Dynamic (`href=${...}`) and spread-carried attributes keep flowing through the attribute-write recheck, unchanged. The `Runtime` interface gains a required `claimElement` member; like the rest of the claim contract it is a no-op null check until a consumer registers.
