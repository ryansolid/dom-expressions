---
"@dom-expressions/runtime": patch
---

Split the serializer's decode half into its own module (`serializer-decode.js`): the shared web plugin set, the JSON codec defaults, `createJSONDeserializer` and `createJSONDataTable`. Lazy client consumers only ever read — the frames data tables and `deserializeStream` now late-load the decode module instead of the full serializer, so the encode machinery (the eval-style hydration `Serializer`, `toCrossJSONStream`) never ships to a browser that doesn't serialize rich arguments (~6.5 kB gz instead of ~13 for the lazy codec chunk). `serializer.js` re-exports the decode module, so the full serialization surface and every existing import are unchanged.
