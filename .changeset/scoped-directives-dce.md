---
"@dom-expressions/compiler": patch
---

More precise dead-code elimination after the `"use server"` client rewrite
in `transformDirectives()` (kept in lockstep with the Babel reference
implementation):

- The shake is now scoped to bindings orphaned by the rewrite (names
  referenced from the replaced function bodies, cascading through removed
  declarations). Code that was already unreferenced before the transform —
  e.g. `const t = startTimer()` written for its side effect — is no longer
  deleted from client output.
- Destructuring patterns are now shaken: `const { db } = createClient()`
  used only inside a server function is removed from the client build along
  with its now-unused imports, closing a server-code-leak hole. Array
  pattern elements become holes (or truncate the tail), rest elements and
  nested patterns cascade, and a declarator whose pattern empties is dropped
  entirely.
- Modules containing a direct `eval(...)` call skip the shake (reference
  counts are unreliable there); the directive rewrite itself still applies,
  and a warning is logged in development mode.
