---
"dom-expressions": patch
---

Expose `VoidElements` and `RawTextElements` consistently from every
runtime entry that already re-exports the other HTML constants. The
runtime added these sets to `client.js` in `0.50.0-next.3`, but
`server.js` was missed and the hand-maintained `client.d.ts` /
`server.d.ts` declaration files didn't pick them up either. Now both
entries (`dom-expressions/client` and `dom-expressions/server`) and
their type declarations export the same constant surface, so consumers
like `@solidjs/web` no longer need to layer their own explicit
re-exports or copy-script workarounds to surface the symbols.
