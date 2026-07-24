---
"@dom-expressions/runtime": patch
---

Exclude a pending boundary's placeholder scaffolding (`<template id="pl-X">` and its `<!--pl-X-->` end comment) from hydration claim arrays. While a boundary is pending its fallback hydrates into the region between the two; counting the scaffolding shifted every positional text claim, so a reactive text hole in the fallback never adopted the server-rendered node — updates that landed before the boundary resolved appended fresh text beside it as permanent debris (solidjs/solid#2936). The scaffolding stays in the DOM for the `$df` swap; it is only skipped when compacting claimable nodes.
