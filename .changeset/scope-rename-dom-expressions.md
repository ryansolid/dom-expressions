---
"@dom-expressions/runtime": patch
"@dom-expressions/babel-plugin-jsx": patch
"@dom-expressions/compiler": patch
"@dom-expressions/hyperscript": patch
"@dom-expressions/tagged-jsx": patch
---

Move all packages under the `@dom-expressions` npm scope with new names:

- `dom-expressions` → `@dom-expressions/runtime`
- `babel-plugin-jsx-dom-expressions` → `@dom-expressions/babel-plugin-jsx`
- `jsx-dom-expressions-compiler` → `@dom-expressions/compiler`
- `hyper-dom-expressions` → `@dom-expressions/hyperscript`
- `tagged-jsx-dom-expressions` → `@dom-expressions/tagged-jsx`

The old unscoped names stop receiving `next` prereleases and remain in use
only by the Solid 1.x maintenance line published from `main`.

`lit-dom-expressions` is dropped from the prerelease line; it has been
superseded by `@dom-expressions/tagged-jsx`.

`@dom-expressions/compiler` now distributes prebuilt native binaries
through per-platform packages (`@dom-expressions/compiler-darwin-x64`,
`-darwin-arm64`, `-linux-x64-gnu`, `-linux-arm64-gnu`, `-win32-x64-msvc`)
resolved automatically via `optionalDependencies`, instead of shipping a
binary inside the main package.
