---
"@dom-expressions/compiler": patch
---

Fix scope resolution in the native JSX transform's binding classification. The binding table collected declarations into flat name-keyed lists that were never cleared when a scope closed, so an identifier in a JSX attribute could resolve to a same-named binding from an earlier, already-closed sibling scope (or fail to be shadowed by an inner declaration). A `ref={div}` whose `div` was a `let` in the enclosing function could be classified as const/function-like because an unrelated earlier callback declared `const div = ...` — emitting the `_$ref(...)`-only form (broken assignment at runtime) or, for stale literal bindings, silently inlining the value into the template. The same stale lookup affected resolvable event-handler detection, static value/boolean inlining of any attribute, style/classList folding, children text, and namespace-import spread classification.

The binding table now keeps a scope stack synchronized with the traversal: statement lists open block frames, functions/arrows/static blocks open function frames, `var` declarations hoist out of block frames to the enclosing function frame, and lookups resolve the innermost live declaration like Babel's scope chain.
