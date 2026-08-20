---
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/runtime": patch
---

Stage 6 (behavior across the border), server half: behind the new `serverComponents` compiler option, ref/on\* positions on server-rendered intrinsic elements compile to one guarded whole-attribute claim hole per element — `sharedConfig.context.claims ? ssrClaim({ click: expr, ref: expr2 }) : ""` — emitting a `_bnd="pos=prop"` marker naming the slot-props stub's prop. Apps not enabling the option compile byte-for-byte as before; plain SSR in an enabled app pays property reads and never evaluates the expressions. The claims gate is on for the whole render on the stream face, scope-gated to server-component interiors on the document face, and off inside client-owned fill windows (a new `clientOwned` counter, distinct from mint suppression so hole re-emissions keep their markers).
