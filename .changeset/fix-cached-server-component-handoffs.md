---
"@dom-expressions/runtime": patch
---

Fix cached server-component frame handoffs so nested document boundaries are not adopted as parent regions, and every live sibling is seeded from rebased retained state during cache-only rebinds.
