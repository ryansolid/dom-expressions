---
"@dom-expressions/runtime": patch
---

`RequestEvent.locals` is now typed by an exported, module-augmentable `RequestEventLocals` interface instead of an inline `Record<string | number | symbol, any>` — the typing seam applications use to declare the state their middleware hangs on the event:

```ts
declare module "@solidjs/web" {
  interface RequestEventLocals {
    user: User;
  }
}
```

Declared once in server.d.ts and re-exported (not re-declared) by the client entry, so both entries — and the server-functions event, which extends the same `RequestEvent` — share ONE interface identity and a single augmentation reaches every `locals`. The interface keeps the same index signature the inline type had, so un-augmented usage stays exactly as permissive as before: augmentation adds precision for the keys it names without gating existing writes. This replaces Start's ambient `App.RequestEventLocals` namespace pattern — a plain exported interface, no global `App.*`.
