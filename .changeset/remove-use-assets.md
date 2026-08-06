---
"@dom-expressions/runtime": patch
---

Remove `useAssets`, `Assets`, and `getAssets`, completing the head-management
RFC's replacement plan. `useHead` is the head-injection surface (structured
tags, streaming, dedupe, hydration adoption — everything the raw-HTML path
lacked), and `getAssets`'s embedded-render role is served by the `onHead`
render option, which is closure-bound to its render instead of reading
ambient state. The `context.assets` evaluation pipeline they fed (shell-time
closure evaluation, the `assets` argument through document assembly and the
sink shell meta) is deleted with them; tracked asset links, inline-style
registration, and hydration script placement are unaffected.
