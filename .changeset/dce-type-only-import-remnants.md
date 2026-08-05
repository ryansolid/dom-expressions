---
"@dom-expressions/compiler": patch
---

Directive DCE removes an import whose surviving specifiers are all type-only. Pruning the last value specifier out of a mixed import left `import { type Session } from "./server-module"` behind — no runtime binding, but still a module load of server code in the client bundle, exactly the leak the shake guards against. The whole-declaration decision now counts value specifiers (default and namespace specifiers count; declaration-level `import type` counts none), mirroring the Babel implementation's fix in solid-start #2273. Imports the shake never touched stay untouched, and a mixed import keeping a live value specifier survives with its type specifiers intact.
