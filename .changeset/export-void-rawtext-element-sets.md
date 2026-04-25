---
"dom-expressions": patch
---

Export `VoidElements` and `RawTextElements` from the runtime constants. These are the standard HTML void-element and raw-text-element sets used by HTML parsers, exposed so downstream tagged-template runtimes (e.g. `sld-dom-expressions`) can consume them without redefining the lists.
