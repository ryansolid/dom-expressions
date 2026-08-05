---
"@dom-expressions/runtime": patch
---

An `:error` record now fires the frame's `onApply` hook (reason `"error"`, once per stream; a new version re-arms). A consumer gating on first apply — a mount holding its covering loading boundary open until the frame has content — releases on a failed stream instead of holding the fallback forever.
