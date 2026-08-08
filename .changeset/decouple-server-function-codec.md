---
"@dom-expressions/runtime": patch
---

Decouple the server-function transport/codec from the codec-free surface
integrations read eagerly. The declaration-metadata channel
(`isServerFunction`, `getServerFunctionMetadata`, `withMeta`) and a new
late-bound RPC seam (`provideServerFunctionRPC`/`getServerFunctionRPC`,
riding a registered symbol on `globalThis`) move to
`server-functions/registry.js`, dependency-free by construction; the flash
cookie's isomorphic half (`FLASH_COOKIE`, `hasFlashCookie`,
`matchFlashCookie`, `clearFlashCookie`) moves beside the cookie codec in
`cookies.js`. Both transport halves fill the seam when the first server
function reference is created (`createServerReference`,
`registerServerFunction`, `GET`) — code that only exists in a bundle when a
`'use server'` function was actually compiled in — so a router reading
`GET`/`decodeResponse` through the seam never imports the transport
statically. The core client/server entries re-export the registry layer and
the flash helpers, letting integrations drop their eager
server-functions-entry imports: an app with zero server functions stops
shipping seroval, the eleven `seroval-plugins/web` plugins, and the fetch
RPC client (~9 KB gz) it could never invoke, while an app with server
functions has the seam filled before any integration code can hold a
reference. All existing `shared.js` import sites keep working via
re-exports; a new size-guard scenario pins the codec-free slice.
