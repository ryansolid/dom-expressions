---
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
---

Give every dynamic child slot its own insertion marker when a parent hosts more than one (solidjs/solid#2830). Adjacent expression slots used to share a marker (`null` at the tail, a shared following sibling, or one reused `<!>` between text), which collapsed them into a single `$$SLOT` ownership region: a node migrating between adjacent slots was destroyed by the slot it left, arrays exchanging members could throw `NotFoundError`, and a slot emptied via `[]` refilled at the wrong position. Slots in multi-slot parents now ride the immediately following static sibling or get a dedicated `<!>` placeholder — the same per-slot geometry hydratable output has always produced, which is why these shapes already worked after hydration. Zero runtime changes; single-slot parents compile byte-identically to before.
