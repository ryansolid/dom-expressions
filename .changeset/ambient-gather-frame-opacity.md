---
"@dom-expressions/runtime": patch
---

The ambient hydration gather treats frame regions as opaque. The document root's `_hk` sweep collected server-component interiors (everything under a `data-fid` frame element), but the root pass never claims there — fills claim through their own scoped registries on their own schedule, and a fill behind a lazy route module legitimately adopts long after the root completes. Those entries only armed the dev completion sweep to report perfectly-claimed markup as "unclaimed server-rendered node(s)" (visible on any document-face load of a route with a lazy client fill, e.g. the notes editor). Prefix-scoped gathers (a boundary's late resume) are untouched: they name exactly what they own, and keys are namespaced by producer chain, so a nested frame's content can never match a foreign prefix. A hydrate root that IS a frame element still claims its own interior.
