---
"@dom-expressions/runtime": patch
---

Head management: reactive group membership and identity refinements for `useHead`.

- `useHead` now accepts `() => HeadTag | HeadTag[]` — a reactive group whose
  membership is re-read on change (client) or resolved at the owning
  boundary's flush (server). This is the primitive component-level grouping
  (Solid Meta's `<Head>`) builds on: a group can compose its tag list after
  registration. Membership changes keep the registration's original commit
  position. Resource tags inside a function-form group emit at their
  boundary's flush rather than eagerly.
- `media` now qualifies replaceable meta identity: metas sharing a
  `name`/`property`/`http-equiv` but differing by media query (e.g.
  `theme-color` light/dark) coexist instead of colliding last-wins.
- `link[rel=icon]` and `link[rel=apple-touch-icon]` are now replaceable
  instead of resource-class, with identity `rel + sizes + type` — deliberately
  excluding `href`, so a swapped icon (per-route favicons, notification
  badges) replaces its predecessor and disposal restores the previous one,
  while size/type variants coexist as separate identities.
