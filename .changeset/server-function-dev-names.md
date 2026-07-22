---
"@dom-expressions/compiler": patch
"@dom-expressions/runtime": patch
---

Dev-only source-name metadata for server functions, for dev tooling that inspects registered functions (e.g. a dev-toolbar server-function inspector) — today those surfaces can only label a function by its opaque hash id.

- **Compiler**: in development (`env: "development"`), `transformDirectives()` emits the extracted function's descriptive source name as a trailing argument to the generated runtime calls — `registerServerReference(id, fn, name)` in server output, `createServerReference(id, name)` in client output. Name resolution matches the existing dev-ID suffix: the function's own name, else the binding/variable name it is assigned to, else the export name; anonymous inline extractions emit nothing. Production output is byte-identical to before — no extra argument, no name leakage — and the argument is trailing/optional, so out-of-band consumers of the ABI (manifests, frameworks) are unaffected.
- **Runtime**: `registerServerReference` and `createServerReference` accept the optional trailing `name` (an `@internal` ABI parameter like the rest) and seed the reference's metadata channel with `{ name }` as a default — explicit `withMeta`/`GET` writes shallow-merge over it, so a user-provided `name` wins. `ServerFunctionMetadata` gains `readonly name?: string`: a dev-only human-readable label, not unique, not an identity key (use `id` for identity).
