# sld-dom-expressions

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
