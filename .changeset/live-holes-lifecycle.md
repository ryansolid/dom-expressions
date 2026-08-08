---
"@dom-expressions/runtime": patch
---

Live-hole lifetime and error semantics: the engine's parent frame now spans thunk evaluation (nested templates resolve their holes at construction, so interior mints land in the parent's supersession list — a parent re-emission retires the ranges it replaces); a real error on sweep is terminal — the hole latches at its last markup, its binding closes, and the failure ships as a hole-keyed error chunk (string message, same shape as the stream-level path) which the client stores hole-scoped and surfaces as a one-time diagnostic.
