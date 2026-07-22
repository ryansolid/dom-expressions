---
"@dom-expressions/compiler": patch
---

Align the AST-native compiler's handling of JSX nested inside attribute values, event handlers, refs, spreads, and component props with the babel plugin. Nested JSX now lowers after the enclosing root finishes (matching babel's deferred re-traversal), so template declaration order matches babel output, setup statements inline into prop/spread getter bodies instead of wrapping in an IIFE (including in universal mode), and SSR temp variables hoist into the nearest enclosing closure rather than module scope — as a parameter when the closure is a zero-arg IIFE, mirroring babel.

`this` handling is now a full port of babel's `transformThis`: `this` in any embedded expression or JSX tag name (`<this.Component/>`) resolves through the captured `_self$` alias, `this` inside nested non-arrow functions and classes is left untouched, and the capture placement follows the JSX root's function parent — inserted before the statement in class methods, hoisted to the top of plain/arrow function bodies, and wrapped around the result expression at top level and in class field initializers.

Additional parity fixes uncovered by adversarial probing:

- JSX initializers inside `export const` and multi-declarator `var`/`let`/`const` statements now lower in statement position (setup statements inserted before the declaration) instead of bailing to an IIFE.
- SSR temp variable (`_v$`) placement is a full port of babel's `Scope.push` targeting: variables hoist to the nearest enclosing block, switch statements redirect to the function parent, default-parameter positions resolve outside the function, and multiple hoists in one scope emit a single combined `var` declaration.
- `class:`/`style:`/`use:`/`attr:`/`bool:` are no longer treated as reserved namespaces (matching the 0.50 babel plugin, which only reserves `prop:`) — in SSR they now pass through as literal attribute names instead of being stripped to their suffix.
- `contextToCustomElements` now defaults to `false`, matching the babel plugin.
- Multiple delegated events on one element emit their `addEventListener`/delegation setup in babel's (reverse-source) order.
- HTML entity decoding in text and attribute values covers the full WHATWG named-entity set instead of the five basic entities.
- `ref` values bound to `const` function declarations use the direct call shortcut instead of the `typeof` fallback, matching babel's constant-binding check.
- Dynamic mode now rejects a native element nested directly under another renderer's native element (`<circle>` inside a dom `<div>`, or vice versa) with the same "not supported in" error the babel plugin throws, instead of silently compiling the child into the wrong renderer's template.
- Static child-expression folding matches babel's `getStaticExpression`: `{true}`/`{false}`/`{null}` are no longer folded into template text (they compile to inserts, like babel), while `NaN`, `Infinity`, unary `-`/`+` numbers, and evaluable template literals now fold statically. `String(number)` spellings for `NaN`/`Infinity` are used in templates.
- Positional child walks chain from the most recently declared walk variable (babel's `tempPath`) instead of re-deriving root-relative `firstChild.nextSibling…` paths — required for correctness in dev hydratable mode, where the previous walk can be a `getFirstChild` call a root-relative path cannot express.
- Generated locals (`_el$`, `_tmpl$`, `_v$`, `_ref$`, `_self$`, `_c$`, `_g$`) now skip names already used anywhere in the source (babel's `generateUid` collision loop) instead of emitting duplicate declarations that fail to parse.
- Namespaced attributes on components (`<Comp ns:x={v}/>`) compile to literal `"ns:x"` prop keys instead of erroring.
- Dynamic `textContent` on an element that also has children keeps the children in the template (babel's `!hasChildren` gate) instead of replacing them with the single-space placeholder.
- `typeof <literal>` folds statically in both child and attribute positions (babel's `path.evaluate()` handles `typeof`).
- The hydratable `scope()` wrap around deferred child slots now keys off babel's full deep `isDynamic` check, so holes whose dynamism hides under a unary/other wrapper expression (`{!cond() ? <i/> : <u/>}`) are scoped correctly.
- Non-dynamic fragment children emit their raw expression (`<>{"static"}</>` → `"static"`) instead of registering an SSR template, matching babel (whose `getStaticExpression` never folds fragment children).
- Multiple `ref` attributes on one universal element emit in babel's (reverse-source, `unshift`) order.
- Universal mode now applies babel's `evaluateAndInline`: confidently evaluable attribute values (const references, `typeof`, arithmetic) fold to literals in `createElement` props.
- Built-in component aliasing (`builtIns`) is now scope-aware, matching babel's `scope.hasBinding` gate: a function/arrow/destructured parameter, loop-head binding, or declaration anywhere in the tag's scope chain (including after the use — scope registration is position-insensitive) suppresses the auto-import, while bindings in sibling functions, inner blocks, or catch clauses the tag isn't inside no longer do.
- The object of a member-expression tag (`<For.Item>`) is never built-in-aliased, matching babel's identifier-only check.
- In dynamic mode, built-in auto-imports resolve against the top-level module instead of the renderer module a native parent routed through, and the same built-in used by both renderers dedupes to a single import.
- An SSR module whose only compiler output is a built-in auto-import no longer drops the import.
- SSR temp variables hoisted from a single-statement loop body (`for (x of l) push(<jsx/>)`) blockify the body and declare inside it (loops are block parents in babel's scope model) instead of hoisting to the function top.
