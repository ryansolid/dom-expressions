---
"@dom-expressions/compiler": patch
---

Fix exponential compile time in deeply nested component trees. A file whose JSX nested function scopes 14 levels deep took 3.6 seconds to compile, 16 levels took 32 seconds, and anything deeper effectively hung the build — the cost grew as 3^depth in nesting, so a single deep component tree could stall a whole project's build.

The deferred JSX pass handed every nested function expression back to the transform's own traversal, which re-entered statement processing for that body. Because `process_statements` runs the deferred lowerer twice per statement, each level processed its children three times. Bodies are now marked as they finish and skipped when the deferred pass meets them again, which visits every body exactly once and makes the transform linear: depth 14 goes from 3.6s to 0.1ms, and depth 800 compiles in 2.4ms. Generated output is unchanged in all three modes (`dom`, `ssr`, `universal`).
