---
"@dom-expressions/runtime": patch
---

Frame sink runs the server component's own render inside the core's context barrier (`runInServerComponentScope`, when the core provides one) at both render entries — document-mode inline rendering (`frameTransformDirectResult`) and standalone streams (`renderServerComponent`). User context never crosses a server-component root, so t=0 inline renders agree with standalone refetches by construction. Slot props are created outside the barrier so client positions re-enter the caller's zone with full app context. Cores without the export fall back to plain evaluation.
