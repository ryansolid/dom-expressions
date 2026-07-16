---
"@dom-expressions/compiler": patch
---

`@dom-expressions/jsx-compiler` is now `@dom-expressions/compiler` (platform
binary packages follow: `@dom-expressions/compiler-darwin-arm64`,
`...-wasm32-wasi`, etc.). The compiler is growing beyond the JSX transform —
directive extraction (`use server` and future directives) and other passes
will live in the same binary, composing over a single parse — so the name no
longer singles out one pass. The old packages will be deprecated on npm with
a pointer to the new names; no API changes ride along with the rename. The
native-binding escape-hatch env var follows the rename:
`JSX_DOM_EXPRESSIONS_COMPILER_NATIVE` → `DOM_EXPRESSIONS_COMPILER_NATIVE`,
and local build artifacts are now named `compiler.*.node` / `compiler.wasi.cjs`.
