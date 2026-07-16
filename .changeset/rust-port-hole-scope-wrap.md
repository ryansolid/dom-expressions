---
"@dom-expressions/compiler": patch
---

Port the hole id-scope design from the Babel plugin: deferred child holes that can allocate hydration ids are wrapped in `scope()` on both the dom and ssr generates (shared `child_slot_allocates_ids` + dynamic predicates so the generates can't desync), replacing the old `orderedInsert` sibling-thunking machinery. Bare getters simplified from `{sig()}` are re-wrapped as `() => sig()` on the dom side so tagging the scope doesn't mutate the user's function.
