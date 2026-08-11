---
"@dom-expressions/runtime": patch
---

Container-trace hooks and the materialization memo live in a registered global, so every bundled copy of the plugin is the same protocol endpoint — a codec chunk carrying its own copy no longer decodes traces to inert markers while the frames client's copy holds the materializer
