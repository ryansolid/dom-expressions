# tagged-jsx-dom-expressions

## 0.50.0-next.30

## 0.50.0-next.29

## 0.50.0-next.28

## 0.50.0-next.27

## 0.50.0-next.26

## 0.50.0-next.25

### Patch Changes

- f6b668b: Emit element claims for static `a[href]` / `form[action]` in tagged templates. Static attributes are baked into the cached `<template>` at build time, so they never pass through the runtime `setAttribute` recheck that claims dynamically-written `href`/`action` — the element node is now stamped as a claim target when the static attribute is baked, and every clone is claimed via `claimElement` at render. Dynamic (`href=${...}`) and spread-carried attributes keep flowing through the attribute-write recheck, unchanged. The `Runtime` interface gains a required `claimElement` member; like the rest of the claim contract it is a no-op null check until a consumer registers.

## 0.50.0-next.24

## 0.50.0-next.23

## 0.50.0-next.22

## 0.50.0-next.21

## 0.50.0-next.20

## 0.50.0-next.19

## 0.50.0-next.18

## 0.50.0-next.17

## 0.50.0-next.16

## 0.50.0-next.15

### Patch Changes

- 402ead1: Rename the prerelease `sld-dom-expressions` package to `tagged-jsx-dom-expressions`, with matching public API names: `createTaggedJSXRuntime`, `TaggedJSXInstance`, and the `.jsx` self-reference tag.
- df03fb8: Move all packages under the `@dom-expressions` npm scope with new names:
  - `dom-expressions` → `@dom-expressions/runtime`
  - `babel-plugin-jsx-dom-expressions` → `@dom-expressions/babel-plugin-jsx`
  - `jsx-dom-expressions-compiler` → `@dom-expressions/jsx-compiler`
  - `hyper-dom-expressions` → `@dom-expressions/hyperscript`
  - `tagged-jsx-dom-expressions` → `@dom-expressions/tagged-jsx`

  The old unscoped names stop receiving `next` prereleases and remain in use
  only by the Solid 1.x maintenance line published from `main`.

  `lit-dom-expressions` is dropped from the prerelease line; it has been
  superseded by `@dom-expressions/tagged-jsx`.

  `@dom-expressions/jsx-compiler` now distributes prebuilt native binaries
  through per-platform packages (`@dom-expressions/jsx-compiler-darwin-x64`,
  `-darwin-arm64`, `-linux-x64-gnu`, `-linux-arm64-gnu`, `-win32-x64-msvc`)
  resolved automatically via `optionalDependencies`, instead of shipping a
  binary inside the main package.

## 0.50.0-next.14

## 0.50.0-next.13

## 0.50.0-next.12

### Patch Changes

- 54880f4: Fix SLD templates so top-level element siblings each get their own template, allowing adjacent top-level expressions to update and clean up correctly.

## 0.50.0-next.11

### Patch Changes

- d5cd499: Remove `on:` namespace event support from compiler, runtime, JSX types, and renderer packages.

## 0.50.0-next.10

## 0.50.0-next.9

### Patch Changes

- 9994328: Support line and block comments inside SLD tags.

## 0.50.0-next.8

## 0.50.0-next.7

## 0.50.0-next.6

### Patch Changes

- a843315: Fix SLD `<template>` rendering so dynamic expressions are inserted into inert template content.
- a8a8f81: Inline `csstype` in the `sld-dom-expressions` build output so the published type declarations do not require consumers to resolve that transitive JSX type dependency separately.

## 0.50.0-next.5

## 0.50.0-next.4

## 0.50.0-next.3

### Patch Changes

- 8f56bc8: Add `sld-dom-expressions`: an AST-based tagged-template runtime that avoids runtime code generation (CSP-safe) and supports a named component registry for tooling-friendly templates.
- 4dae801: Normalize the `repository` field in every package to the standard npm
  convention: a `git+https://github.com/ryansolid/dom-expressions.git` URL
  with a `directory` pointing at the package within the monorepo. Restores
  "View source" / "Open in repo" links on the npm registry and unblocks
  tooling that resolves source from package metadata.
- 5463c56: `createSLDRuntime(runtime)` now returns a ready-to-use tag directly (with an empty component registry) instead of a factory that needs a second call. Components are registered via `.define({ ... })` on the returned tag, which already existed for derivation. This removes the awkward `createSLDRuntime(r)({})` for the no-components case and makes the runtime-binding step single-purpose.

  Migration:

  ```ts
  // before
  const sld = createSLDRuntime(runtime)({ For, Show });

  // after
  const sld = createSLDRuntime(runtime).define({ For, Show });

  // no components case
  const sld = createSLDRuntime(runtime);
  ```

- f32587f: Apply the single-node flatten uniformly so an `sld` template that resolves to one node/value returns it as a scalar (matching the existing behaviour of templateless paths). This lets downstream `insert` take the fast scalar path instead of reconciling a one-element array. The tag's return type is updated to `JSX.Element` to reflect the actual scalar-or-array shape; consumers that iterate or spread should normalize via `Array.isArray(result) ? result : [result]`.
- bacbd0c: Expose `Runtime`, `ComponentRegistry`, and `FunctionComponent` from the
  package entry so consumers wiring a custom reactive core can type their
  runtime object. Fix `Runtime.spread`'s `skipChildren` parameter type from
  `Boolean` to `boolean`. Mark the package as `sideEffects: false` so
  bundlers can tree-shake unused exports.
