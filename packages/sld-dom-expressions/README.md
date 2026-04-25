# sld-dom-expressions

A tagged-template runtime for fine-grained reactive libraries (e.g. SolidJS).

`sld` parses templates at runtime and installs reactive bindings against the
resulting DOM. Component references are real JavaScript values — either a name
registered via `.define()` or an expression hole — never a string parsed at
render time.

## Install

```sh
npm install sld-dom-expressions
```

## Quick start

`createSLDRuntime(runtime)` returns a ready-to-use tag bound to that runtime.
Components are added via `.define({ ... })`, which returns a new tag with the
combined registry.

```ts
import { createSLDRuntime } from "sld-dom-expressions";
import * as web from "@solidjs/web";
import { For, Show, createSignal } from "solid-js";
import { render } from "@solidjs/web";

const sld = createSLDRuntime(web).define({ For, Show });

function Counter() {
  const [count, setCount] = createSignal(0);
  return sld`
    <button onClick=${() => setCount(c => c + 1)}>
      Count: ${count}
    </button>
  `;
}

render(Counter, document.body);
```

## API

### `createSLDRuntime(runtime): SLDInstance<{}>`

Binds the runtime once and returns a tag with an empty component registry.
The `runtime` object provides the reactive primitives and HTML facts the tag
needs at render time. When using `@solidjs/web`, the module itself satisfies
the shape (`import * as web from "@solidjs/web"`).

The `Runtime` type is exported for consumers wiring custom reactive cores:

```ts
import { type Runtime } from "sld-dom-expressions";

interface Runtime {
  insert(parent: Node, accessor: any, marker?: Node | null, init?: any): any;
  spread(node: Element, accessor: any, skipChildren?: boolean): void;
  createComponent(Comp: (props: any) => any, props: any): any;
  mergeProps(...sources: unknown[]): any;
  SVGElements: Set<string>;
  MathMLElements: Set<string>;
  VoidElements: Set<string>;
  RawTextElements: Set<string>;
}
```

### `tag.define(components): SLDInstance<T & TNew>`

Returns a new tag with the supplied components merged into the registry.
The original tag is unchanged.

```ts
const base = createSLDRuntime(web);
const withFor = base.define({ For });
const withForAndShow = withFor.define({ Show });
```

### `tag.sld`

Self-reference. Lets every template start with `sld\`...\`` regardless of
which local variable name was used to bind the tag — useful for codemods,
syntax highlighters, and tooling that keys off the literal text `sld\``.

### `tag.components`

The current registry, as a plain object.

## Template syntax

### Elements and components

```ts
sld`<div />`               // self-closing
sld`<div></div>`           // matched
sld`<MyComponent />`       // registered component (capitalized)
sld`<${MyComponent} />`    // inline component via expression hole
sld`<${MyComponent}>...<//>`  // shorthand close for inline component (see Limitations)
```

- Tag names start with `a-zA-Z$_` and may contain `a-zA-Z0-9$.:-_`.
- Capitalized tag names are looked up in the registry. An unregistered
  capitalized name throws.
- Lowercase tag names are HTML/SVG/MathML elements; namespace is inferred
  from the element name and walked into nested children.

### Text and whitespace

- Text content is decoded as HTML (`&copy;` → `©`, `&gt;` → `>`).
- Pure-whitespace runs between elements are dropped from the AST.
- Leading and trailing whitespace inside an element is dropped when the
  element contains at least one expression hole.
- When in doubt, use an expression: `sld\`<p>${"  exact  "}</p>\``.

### Attributes and properties

```ts
sld`<input value="hi" />`           // static string attribute
sld`<input disabled />`             // static boolean attribute
sld`<input value=${val} />`         // dynamic attribute or property (auto)
sld`<input prop:value=${val} />`    // forced DOM property
sld`<input attr:foo=${val} />`      // forced HTML attribute
sld`<input ...${props} />`          // spread
sld`<input ref=${el => ...} />`     // ref (not reactive)
sld`<input on:input=${handler} />`  // native addEventListener
sld`<input onClick=${handler} />`   // delegated event (Solid)
sld`<input onclick=${handler} />`   // bound listener (legacy lowercase)
```

`children` as an attribute is honored only when the element has no template
children, matching JSX behavior.

### Reactivity

A function passed to a non-event, non-`ref` attribute is auto-wrapped as a
getter if it takes zero arguments. Both forms below are reactive and
equivalent:

```ts
const [count] = createSignal(0);

sld`<button count=${() => count()} />`;
sld`<button count=${count} />`;
```

If the value you want to pass is itself a zero-arg function and you don't
want it auto-wrapped, wrap it again to break the heuristic:

```ts
sld`<Route component=${() => Counter} />`;
```

`on*` and `ref` props are never auto-wrapped — they're passed as-is.

## JSX vs `sld`

| Feature             | Solid JSX                               | `sld` tagged template                              |
| :------------------ | :-------------------------------------- | :------------------------------------------------- |
| **Fragments**       | Required: `<>...</>` for multiple roots | None needed: returns a node, or array of nodes     |
| **Spread**          | `<div {...props} />`                    | `<div ...${props} />`                              |
| **Comments**        | `{/* ... */}`                           | `<!-- ... -->` (stripped)                          |
| **Raw-text tags**   | `innerHTML` workaround                  | `<style>` / `<script>` bodies are raw text         |
| **Whitespace**      | JSX-style stripping                     | Trims between tags; preserves inside text          |
| **Reactivity**      | Signals auto-wrapped                    | Zero-arg functions auto-wrapped (use `() =>` to opt out) |
| **Component refs** | Identifier in scope                     | Registered name (`<Foo />`) or expression (`<${Foo} />`) |

Because `sld` returns a `JSX.Element` — a single node when the template
resolves to one root, an array when it resolves to many — consumers that
need to iterate or spread should normalize:

```ts
const result = sld`<div /><span />`;
const nodes = Array.isArray(result) ? result : [result];
```

## License

MIT
