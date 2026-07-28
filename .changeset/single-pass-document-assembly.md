---
"@dom-expressions/runtime": patch
---

Assemble the SSR document in a single pass. `renderToString` and the streaming shell each ran four sequential injection passes (assets, preload links, inline styles, hydration scripts), every one of which searched the document for its anchor and rebuilt it — four full copies of the shell, or of a multi-hundred-KB SSR body. Head content is now concatenated once and spliced with the script tag in one construction, byte-for-byte identical to the previous output. Anchor searches stay demand-driven, so a body-only render (no assets, no preloads, no inline styles) never scans the document at all: a missing-needle `indexOf` flattens the string and walks every character, which on a 400KB body costs more than the render's own string work.
