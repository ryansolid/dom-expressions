---
"@dom-expressions/runtime": patch
---

Add a call-site handoff to server component boundaries so a live mount survives argument changes

Per-args boundary identity resolves each `(function, arguments)` call to its own component, which made a live call site switching arguments (a search box filtering a server-rendered list) swap boundaries and destroy client slot state. Components minted by `createServerComponentHandler` are now branded with a `COMPONENT_HANDOFF` contract: when a reader offers its previous value and the incoming component is the same function under new arguments, `take()` rebinds the mounted frame to the new call — the element and its keyed slot ranges stay while the new call's stream morphs in place. Frames gained `rebind`/`rebase` for this, slot regions are keyed by argument name so wire renames follow without re-calling occurrences, and preloads — which have no reader — never take a mount, preserving isolation.
