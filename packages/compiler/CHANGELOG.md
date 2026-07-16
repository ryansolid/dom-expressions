# @dom-expressions/compiler

## 0.50.0-next.22

## 0.50.0-next.21

## 0.50.0-next.20

## 0.50.0-next.19

### Patch Changes

- ff7818e: Install the WebAssembly compiler fallback automatically so StackBlitz and other environments without native addon support work without package-manager architecture configuration.

## 0.50.0-next.18

### Patch Changes

- abe0213: Add an optional WebAssembly compiler binding for StackBlitz WebContainers and other environments that cannot load native Node.js addons.

## 0.50.0-next.17

### Patch Changes

- 0847c13: Reach full output parity with babel-plugin-jsx across all modes. In dynamic (multi-renderer) mode, native elements belonging to another renderer are now routed to that renderer's transform instead of being templated as DOM (e.g. `<mesh>` inside a DOM subtree lowers through the universal renderer), DOM subtrees flatten their setup statements in statement position and single-child component getters, and shared wrapper helpers (`createComponent`, `mergeProps`, `applyRef`, `setProperty`) import once from the top-level module. JSX inside dynamic attribute values now lowers after the enclosing root completes, matching Babel's template registration order and effect getter wrapping. Dev hydratable mode fixes: intermediate element walks emit validated `getFirstChild`/`getNextSibling` lookups chained through walk variables, and nested elements no longer omit closing tags their position requires (e.g. `</li>` before a following sibling).
- 04a710f: Fix native JSX compiler output for delegated member-expression event handlers so emitted `addEvent(..., true)` calls are paired with `delegateEvents([...])` registration.
- 70fe7e7: Fix native JSX compiler insertion markers so dynamic child slots preserve their runtime position after surrounding static template content, including hydratable marker regions.
- bb7b2fd: Fix omitLastClosingTag corrupting templates when per-slot insertion markers follow the last static element. An element trailed by two or more dynamic slots now keeps its closing tag, so the trailing `<!>` placeholders parse as its siblings instead of being swallowed as children of the still-open element (which crashed the template walk with "Cannot read properties of null (reading 'nextSibling')").
- bab4c72: Align the native JSX compiler's DOM output with babel-plugin-jsx across a set of behavioral gaps found by the new compiler parity suite:
  - SVG/MathML partials (e.g. a top-level `<rect>` or `<mrow>`) are now wrapped in their owner tag and compiled with template flag `2`, and templates whose subtree needs `importNode` cloning (custom elements, `is` attributes, lazy-loading `img`/`iframe`) are flagged with `1`. The `xmlns` attribute used to detect the namespace is dropped from serialized templates.
  - Hydratable mode now honors `$ServerOnly` and skips templates for `html`/`head`/`body` document shells, resolving `html` children by tag via `getNextMatch`.
  - Hydratable dynamic slots adjacent to text now emit `<!$><!/>` marker pairs instead of client-only `<!>` placeholders, positional walks are hoisted ahead of inserts and chain from the previous marker's end node (root-relative paths could land inside SSR'd marker content), and closing tags are no longer omitted before hydration markers.
  - `runHydrationEvents()` is emitted once per template root after setup (including for spreads, which may carry delegated handlers) instead of after every delegated event assignment.
  - Dynamic `prop:*` attribute values are now wrapped in effects instead of being assigned once, comma/sequence expressions in child positions are treated as dynamic, and the `/*@static*/` marker is respected on inserted child expressions.

- 0847c13: Close the remaining configuration gaps between the AST-native compiler and the babel plugin:
  - `effectWrapper` and `memoWrapper` now accept custom import names (babel's string form): `effectWrapper: "createRenderEffect"` imports and calls `createRenderEffect` instead of `effect`. `false` (or `""`) still disables the wrapper. The options no longer need to be disabled as a pair — `wrapConditionals: false`, `effectWrapper: false`, and `memoWrapper: false` each work independently, matching babel. With `memoWrapper: false`, conditions compile memo-less (plain thunks) and SSR component children in multi-child arrays unwrap to their bodies, identical to the babel plugin.
  - `requireImportSource` is implemented: when set, only files carrying a `@jsxImportSource <source>` comment are transformed (same comment-splitting match as babel — the comment's remainder after `@jsxImportSource` must equal the configured source exactly); other files return their source text untouched.
  - `validate` is implemented (default `true`, like babel): DOM template markup is re-parsed with a spec HTML parser (html5ever, the Rust counterpart of the babel plugin's parse5) and a warning is printed to stderr when a browser's `innerHTML` would restructure the markup (implied end tags, foster parenting, nested `<a>`/`<form>`/`<button>`, misplaced hydration markers). Warning text, text-node normalization, table-partial wrapping, and the skip list match the babel plugin's `isInvalidMarkup`.
  - `inlineStyles: false` parity in spreads: a `style` on a native element with spread attributes now wraps in the same IIFE getter babel produces (previously it could land as a plain static prop), and a `/*@static*/` marker on a style stops applying under `inlineStyles: false` because the rewrap discards the original node (babel behavior).

  An option-matrix parity suite now compiles the whole fixture corpus under each flag flipped from its default (150 mode × variant combinations) and requires identical normalized output from both compilers, with no exclusions.

- 0847c13: Rewrite the native compiler's DOM attribute pipeline to match the Babel plugin's output:
  - Dynamic attribute bindings across a whole template root now batch into a single `effect()` with a previous-values object, instead of one effect per attribute.
  - Stateful DOM properties (`input.value`/`checked`, `select.value`, `option.value`/`selected`, `video`/`audio` `muted`, and their `default*` forms) compile to inlined attributes when static and `prop:` property writes when dynamic, including the `<select value>` `queueMicrotask` race guard and the input/textarea nullish-value fallback.
  - Class and style attributes go through the full preprocessing pipeline: static styles merge into the template, style objects split into `setStyleProperty()` calls, class arrays and fixed-shape class objects split into static classes and `classList.toggle()` bindings, and duplicate attributes dedupe last-wins.
  - Dynamic `textContent` writes to a dedicated placeholder text node's `data` instead of assigning `textContent`.
  - Refs follow the Babel branch order (constant bindings call `ref()` directly; lvalues get the callable-check with assignment fallback), and delegated event handler groups emit as flat statements ahead of other element expressions.
  - Confident compile-time evaluation folds template literals, arithmetic, logical/conditional expressions, and static bindings into literals, matching Babel's `path.evaluate()` usage.

- 99ce3b2: Port the ssr spread-path hydration id fixes (#540) to the native compiler: dynamic children holes of spread elements (`<a {...props}>{children()}</a>`) are now scope-wrapped so they evaluate under their own owner scope, and hydratable spread props defer `mergeProps` behind a thunk so `ssrElement` allocates the element's hydration key before dynamic props run — previously every hydration id following the hole drifted, leaving siblings unclaimed.
- 0847c13: Port the Babel plugin's attribute preprocessing pipeline to the native compiler and share it across DOM, SSR, and universal outputs. Attribute handling now matches babel-plugin-jsx: duplicate attributes deduplicate to the last value, multiple `class` attributes merge, static `style`/`classList` objects split and fold into the template, confidently-evaluable expressions (including conditionals and logicals over known constants) inline as static attribute text, dynamic attribute updates batch into a single effect with previous-value tracking, and `textarea` `value` folds into element children where Babel does. SSR output gains the same planning: `textContent`/`innerHTML` become element children instead of literal attributes, reserved namespaces (`prop:`, `on*`, `use:`, `bool:`, etc.) are handled consistently, and hydratable `textContent` gets the `|| " "` guard.
- 0847c13: Align the AST-native compiler's handling of JSX nested inside attribute values, event handlers, refs, spreads, and component props with the babel plugin. Nested JSX now lowers after the enclosing root finishes (matching babel's deferred re-traversal), so template declaration order matches babel output, setup statements inline into prop/spread getter bodies instead of wrapping in an IIFE (including in universal mode), and SSR temp variables hoist into the nearest enclosing closure rather than module scope — as a parameter when the closure is a zero-arg IIFE, mirroring babel.

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

## 0.50.0-next.16

### Patch Changes

- 04849df: Preserve JS value semantics for wrapped `&&` conditions (#532). The dom generate's condition wrap used to emit `memo(() => !!left)() && right`, collapsing every falsy left value to `false` — visibly wrong for component props (`undefined` became `false`, breaking `== null` checks) and a hydration mismatch against the untransformed server output (`{0 && <div/>}` rendered "0" on the server, nothing on the client). `left && right` is exactly `left ? right : left`, so the wrap now emits `memo(() => !!left)() ? right : left`: branching still keys off the memoized truthiness (truthy-value churn never re-creates the right side) while the alternate returns the raw left, matching the server for free. Statically boolean lefts (comparisons, `!x`) keep the plain `memo(() => left)() && right` form — the memo's value is the expression's value, so it's already exact with no second evaluation. Ported identically to the Rust jsx-compiler.
- bb7470e: Give every dynamic child slot its own insertion marker when a parent hosts more than one (solidjs/solid#2830). Adjacent expression slots used to share a marker (`null` at the tail, a shared following sibling, or one reused `<!>` between text), which collapsed them into a single `$$SLOT` ownership region: a node migrating between adjacent slots was destroyed by the slot it left, arrays exchanging members could throw `NotFoundError`, and a slot emptied via `[]` refilled at the wrong position. Slots in multi-slot parents now ride the immediately following static sibling or get a dedicated `<!>` placeholder — the same per-slot geometry hydratable output has always produced, which is why these shapes already worked after hydration. Zero runtime changes; single-slot parents compile byte-identically to before.
- 4f00432: Port the hole id-scope design from the Babel plugin: deferred child holes that can allocate hydration ids are wrapped in `scope()` on both the dom and ssr generates (shared `child_slot_allocates_ids` + dynamic predicates so the generates can't desync), replacing the old `orderedInsert` sibling-thunking machinery. Bare getters simplified from `{sig()}` are re-wrapped as `() => sig()` on the dom side so tagging the scope doesn't mutate the user's function.
- 668264f: Universal JSX now passes compile-time static host props to `createElement(tag, staticProps)` so custom renderers can configure nodes before children are inserted. Dynamic props and elements with spreads continue to use the existing `setProp` / `spread` paths.

## 0.50.0-next.15

### Patch Changes

- dc546f3: Add initial AST-native DOM support for plain dynamic attributes by lowering them through reactive effects and `setAttribute`. The compiler now also supports the full Babel DOM `attributeExpressions` fixture, including DOM child-property, style, class/className, state-property, ref, `prop:*`, and spread attribute lowering.

  The Oxc DOM slice now supports inline event handlers for delegated and native events, follows Babel's updated removal of `on:` namespace-event handling, supports `delegateEvents` / `delegatedEvents` configuration, mirrors the Babel/runtime constants needed for void elements, child properties, namespaces, delegated events, and DOM state-property classification, honors Babel-style `omitLastClosingTag` / `omitNestedClosingTags`, `omitQuotes`, `omitAttributeSpacing`, `inlineStyles`, `effectWrapper: false`, paired `wrapConditionals: false` / `memoWrapper: false` wrapperless mode, `requireImportSource`, `staticMarker`, and `validate` template/update options, lowers known namespaced DOM attributes such as `xlink:href` through `setAttributeNS`, covers additional full Babel DOM fixtures including `components`, `SVG`, `conditionalExpressions`, `customElements`, `fragments`, `insertChildren`, `multipleClassAttributes`, and `SVGComponentPartial`, adds parseable `namespaceElements` coverage, supports Solid-compatible custom element context capture through `contextToCustomElements`, adds Babel-aligned `memo` predicate lowering for DOM conditional children and component props plus fragment/component child dynamic expressions, wraps dynamic DOM child member/call/optional/nullish expressions like Babel, handles optional-chain component children and nested fragment conditionals with Babel-shaped getters, memo wrappers, and empty-fragment arrays, supports hydratable DOM fixture output through `getNextElement` template roots, replays queued hydratable delegated events through `runHydrationEvents`, supports dev hydratable DOM validation walks through `getFirstChild` / `getNextSibling`, starts SSR mode with native element/text lowering through `ssr`, dynamic text interpolation through `escape`, plain dynamic native attributes through `escape(..., true)`, hydratable root template keys through `ssrHydrationKey`, defers later hydratable SSR child slots that allocate hydration IDs after deferred children, full coverage for all checked-in Babel SSR and SSR hydratable fixture families, begins universal mode with native elements, static attributes, dynamic text insertion, component calls through shared prop assembly, spread attributes, spread children, and full coverage for the currently checked universal fixtures, adds dynamic mode with DOM-renderer routing, universal fallback, and hybrid DOM/universal dispatch while avoiding duplicate helper import aliases, validates the supported compiler option surface so non-default unsupported Babel options throw instead of being silently ignored, updates the public README and TypeScript declarations for the current option surface, splits SSR/universal target helpers into submodules, shares common AST construction helpers across targets, and expands component lowering with member-expression prop getters, `@static` opt-out, JSX child arrays, dynamic child getters, configured `builtIns` imports, spread props through `mergeProps`, JSX member component callee construction, component ref normalization for identifier/static/simple optional/call/computed refs, return-statement JSX setup lowering, getter setup lowering, and `this` capture for supported class method/field JSX.

- df03fb8: Move all packages under the `@dom-expressions` npm scope with new names:
  - `dom-expressions` → `@dom-expressions/runtime`
  - `babel-plugin-jsx-dom-expressions` → `@dom-expressions/babel-plugin-jsx`
  - `jsx-dom-expressions-compiler` → `@dom-expressions/jsx-compiler`
  - `hyper-dom-expressions` → `@dom-expressions/hyperscript`
  - `tagged-jsx-dom-expressions` → `@dom-expressions/tagged-jsx`

  The old unscoped names stop receiving `next` prereleases and remain in use
  only by the Solid 1.x maintenance line published from `main`.

  `lit-dom-expressions` is dropped from the prerelease line; it has been
  superseded by `@dom-expressions/tagged-jsx`.

  `@dom-expressions/jsx-compiler` now distributes prebuilt native binaries
  through per-platform packages (`@dom-expressions/jsx-compiler-darwin-x64`,
  `-darwin-arm64`, `-linux-x64-gnu`, `-linux-arm64-gnu`, `-win32-x64-msvc`)
  resolved automatically via `optionalDependencies`, instead of shipping a
  binary inside the main package.
