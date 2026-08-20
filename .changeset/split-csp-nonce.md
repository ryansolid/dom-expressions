---
"@dom-expressions/runtime": patch
---

Allow `nonce` on `renderToString` and `renderToStream` to be a `{ script, style }` pair. The style nonce is used for stylesheets and style preloads; the script nonce is used for scripts, script preloads, and script-like `modulepreload` links. A `modulepreload` with a missing or unknown `as` is treated as a script. Other preload destinations get no nonce. Passing a string still uses it for both.

Runtime-generated asset links now receive the appropriate nonce, so manifest CSS works with a nonce-only CSP. An explicit `useHead` nonce previously got the render nonce appended on top, emitting the attribute twice; it now takes precedence, and `nonce: false` opts out.

This applies only to server-rendered output. Client-created assets and browser-side `useHead` updates are unchanged. If one `<link>` declares several destinations, stylesheet routing wins; split it when the nonces differ.
