---
"@dom-expressions/runtime": patch
---

Resolve `<select value>` into `selected` options in SSR output (solidjs/solid#3013). HTML defines no `value` attribute for `<select>`, so the bound value the compilers emit as an attribute marker was inert: server markup always showed the first option until hydration assigned the property (a gap inherited from 1.x, not a regression). A flush-time pass over shell and fragment HTML now marks the matching option(s) `selected` — matching by `value` attribute or, per spec, whitespace-collapsed text content — and strips the invalid attribute. Multiple selects match each value in the array. An option carrying `selected` already (`defaultSelected`) wins over the bound value, mirroring the `defaultValue` + `value` contract on `<input>`. A select split across flush chunks (a `Loading` boundary inside it) is left untouched and settles at hydration, as before.
