---
"@dom-expressions/runtime": patch
---

`transformResult` (both the server-wide config and the per-request handler option) now receives the call's identity on its context: the function `id` and the parsed `args` the implementation was invoked with, on returned and thrown results alike. This matches the context `transformDirectResult` already receives for in-process SSR calls, so a result policy that keys state by the call — deriving a wire address, capturing a prerender artifact — works uniformly over either dispatch path. Type declarations for both transforms were updated to match (`transformDirectResult`'s previously understated its context, which also carries `args` and `event`).
