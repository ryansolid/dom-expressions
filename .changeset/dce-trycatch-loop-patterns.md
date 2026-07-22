---
"@dom-expressions/compiler": patch
---

Close two client-DCE parity gaps in the `"use server"` directive transform against the Babel reference (SolidStart's `remove-unused-variables` pass), and fix a hang the gaps were masking:

- Declarations orphaned by the server-function rewrite are now pruned everywhere the reference pruned them, not just in statement lists: `for` initializers, `for-in`/`for-of` left-hand patterns, single-statement `if`/`while`/`do-while`/labeled bodies (emptied bodies become `{}`, matching Babel), and inside `try`/`catch` blocks — a module-level `try { var conn = connect(); } catch (e) { log(e); }` whose declarator's only reads lived in an extracted body now sheds the declarator (and the imports it stranded) while the try/catch shell and catch binding stay, per the reference semantics.
- Individual rewrite-orphaned elements of destructuring patterns in loop heads are now pruned like their statement-position counterparts (`for (const { meta, name } of rows)` drops `meta` when only extracted code read it). When every element of a loop-left pattern is orphaned the pattern empties to `{}` and the loop keeps iterating — a deliberate improvement over the Babel reference, which crashes trying to remove the entire loop binding.
- The removal fixpoint now tracks whether a pass actually mutated the tree and stops when none does, instead of looping forever when a requested removal wasn't structurally applicable (previously an infinite loop on orphan names colliding with loop-head bindings).

The established invariants are unchanged: only rewrite-orphaned bindings are shaken, exported bindings never are, and direct `eval` still bails the pass. New `unused-trycatch`, `loop-header-patterns`, and `loop-pattern-emptied` fixtures pin the behavior in both output modes and envs (the emptied-pattern client files are frozen from the native output, documented as the intentional divergence).
