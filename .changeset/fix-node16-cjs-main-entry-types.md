---
"@dom-expressions/runtime": patch
---

The main client entry's types are importable from Node16 CJS again: `SerovalNode` is hand-declared in serializer-decode.d.ts like the plugin types (same rationale — seroval's published d.ts don't resolve under nodenext), and every entry needing only decode-half types (`JSONCodecOptions`, `SerializerPlugin`) imports them from the seroval-free decode module instead of the full serializer
