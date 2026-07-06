---
"@dom-expressions/runtime": patch
---

Fix delegated events never reaching outer roots when a render root is
rendered inside another root's DOM (embedded widgets, microfrontends).
The first (innermost) container listener marked the event consumed for
every other root, so an outer root's delegated handlers were silently
skipped even though the native event bubbled through its elements: a
plain `addEventListener` on the same element fired while the delegated
handler didn't.

`$$EVENT_OWNER` now records the boundary of the most recent walk instead
of a consumed flag: an ancestor container whose subtree contains that boundary
resumes the handler walk from it up to its own boundary, so each root's
handlers fire exactly once, innermost-out, matching native bubbling.
`stopPropagation()` inside a nested root still suppresses outer roots (it
stops the native event before their listeners run), and hydration event
replay now relays queued events through all matching roots innermost-first
so pre- and post-hydration clicks behave identically. Apps that relied on
nested roots to isolate clicks from outer handlers should use
`stopPropagation()`, which remains the documented mechanism. Non-nested
apps are unaffected; the resume path is unreachable unless an inner root
already handled the event.
