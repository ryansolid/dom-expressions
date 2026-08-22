---
"@dom-expressions/runtime": patch
---

Fix a document shell's static `<title>` shadowing the `useHead` winner in served HTML. Browsers honor the first title tag, so flushing the registry's winner as a second tag let the shell fallback win the served page. In document mode the winner is now byte-rewritten into the static tag in place (original text stashed on `data-dhf` — the client registry's restore fallback, shed with `data-dh` on full disposal); with no static title a marked tag joins the `</head>` splice. Embedded (`onHead`) hosts, whose markup isn't visible, receive a retitle script instead (literal tag under `noScripts`). Late-boundary `"t"` ops now stash an unmarked title's text on `data-dhf` before the first overwrite so the client-side fallback restore survives streamed retitles.
