---
"@dom-expressions/compiler": patch
---

`transformDirectives` now validates closure captures at compile time. A function-level `"use server"` function may only reference its own parameters and locals (including nested function scopes within it), module top-level bindings (imports, top-level `const`/`let`/`var`/`function`/`class`), and true globals. Referencing a binding declared in an intermediate enclosing scope — an enclosing function's local or parameter, a loop variable, a catch parameter — previously extracted a function that silently lost the captured value; it is now a compile error naming the variable, the capture site, and the declaration site (e.g. ``src/module.ts:5:12: server functions cannot capture non-top-level variables: `secret` is declared in an enclosing function``). Module-level `"use server"` directives are unaffected, as are directives the transform never extracts (object/class methods, and functions nested inside an already-extracted server function).
