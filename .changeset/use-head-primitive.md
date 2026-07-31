---
"@dom-expressions/runtime": patch
---

Add `useHead`, a streaming-correct head-management primitive (stage 1 of the
head management RFC, `docs/head-management-rfc.md`).

```ts
type HeadTag = {
  tag: "title" | "meta" | "link" | "style" | "script" | "base";
  props: Record<string, any>; // values may be getters (lazy on the server, reactive on the client)
  key?: string | (() => string); // explicit identity override
};
function useHead(tag: HeadTag | HeadTag[]): void;
```

- An array is a group — one replacement set; a single tag is a group of one.
- Replaceable tags (title, meta, canonical links, inline style/script bodies)
  resolve by last-committed group per identity. On the server they render into
  `<head>` at shell flush and stream as patch ops that apply atomically with
  their suspense boundary's reveal (riding the `$df` activation, including
  style gates). Props getters evaluate exactly once, at the owning boundary's
  flush — the migration path for deferred CSS collectors.
- Resource tags (`link rel=preload/preconnect/…`, stylesheets, `script[src]`)
  emit eagerly with identity dedupe (URL + qualifying attributes), sharing one
  identity set with manifest-driven asset tracking. On the client, plain
  stylesheets ride the ref-counted asset registry (removal follows the owner);
  hints are never retracted.
- `title` is a hard singleton with stack semantics: disposal restores the
  previous winner, then the static shell title.
- `meta[charset]` and `base` splice into a head prelude immediately after the
  `<head>` open tag and are shell-only.
- Client registrations are reactive, keep their commit position across
  updates, and own their DOM via `data-dh` markers — static head content and
  third-party tags are never clobbered. Hydration claims server-rendered
  winners in place; streamed patches route through the registry once it is
  live, so head state never flickers regardless of chunk/bundle timing.

`useAssets`, `getAssets`, and `Assets` are now deprecated and will be removed
before `0.50.0` stable; migrate head injection to `useHead`.
