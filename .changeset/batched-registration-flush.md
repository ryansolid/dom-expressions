---
"@dom-expressions/runtime": patch
---

The frame host's registration flush applies a frame's buffered chunks as
ONE store write instead of one apply per chunk. Per-chunk applies ran a
full slot sync between records, so the first drained record mounted every
discovered occurrence — the rest record-less — and each later record then
looked like an args change, re-calling occurrences with incomplete args.
On adopted (document-SSR) boundaries that re-call rendered without the
still-undrained args and wiped server-rendered interiors at boot — a flaw
previously masked by the unconditional claim behavior that `0.50.0-next.27`
removed. The buffer holds a single version by construction, so the merge is
exact. If you adopted `0.50.0-next.27`, take this release with it.
