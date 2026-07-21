---
"@dom-expressions/runtime": patch
---

Type-level groundwork for typed-path navigation (Wave A):

- JSX `href` on `<a>`/`<area>` now accepts `SerializableAttributeValue` in
  addition to `string` — the same treatment form `action` already has — so
  URL-bearing objects (e.g. a router's typed path nodes) typecheck directly
  as `href={paths.users(id)}`. SSR serialization of such values is the plain
  `toString()` coercion, now pinned by test.
- The client-side navigation attribute contract (`link`, `state`, `noScroll`,
  `replace`, `preload`) moved into the shared JSX types on
  `AnchorHTMLAttributes`. These are inert markup on their own; routing
  integrations that delegate anchor clicks read them at event time.
- New `Href` brand in the response module: a registered-symbol
  (`Symbol.for("solid.Href")`) brand for URL-bearing values, with `isHref()`
  guard. `redirect()` now accepts `string | Href`, coerces branded values via
  `String()`, and throws a `TypeError` for unbranded objects instead of
  silently emitting `[object Object]` in the `Location` header.
