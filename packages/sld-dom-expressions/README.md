# sld

sld is a no-build, no-JSX tagged-template library for SolidJS and designed to work with template tooling (editor syntax highlighting, formatters, etc.).

## Quick overview

- `sld` - default tagged template instance with the built-in component registry.
  - `sld.define({CompA})` - creates a new instance from the existing instance and combines registered components
  - `sld.sld` - self reference so all tags can start with `sld` for potential tooling
- `SLD({CompA})` - factory function which includes built-in components
- `createSLD({CompA})` - factory function which doesn't include built-in components
- `run(CompA)(props)` helper function for createComponent to get better TypeScript types. Must manually do getters on props.

## Basic usage

Use the default `sld` tag for templates and the `SLD` or `sld.define` factory to create a local instance.

```ts
import { sld } from "solid-html";

//Write a component with JSX like syntax
function Counter() {
  const [count, setCount] = createSignal(0);
  return sld`<button onClick=${() => setCount((v) => v + 1)}>
    ${() => count()}
  </button>`;
}

//Use component in another template by defining or inlining
function App() {
  return sld.define({ Counter }).sld`
  <Counter />
  ${run(Counter)()}
`;
}

//Render like normal solid-js component
render(() => App(), document.body);
```

## Syntax

### Text & Whitespace

- Text in the template gets set via innerHTML so it will decode html encoded characters. You really only need this for < `&lt;` and > `&gt;` and sometimes spaces (&nbsp;)
- Pure whitepace between elements is ignored in the AST. Leading and Trailing Whitespace is omitted when there is at least one expression in it.
- When in doubt set text via expression to ensure exact match.

### Elements && Component Tags

- Tag names must start with `a-zA-Z$_` and then can have `a-zA-Z0-9$.:-_` characters.
- Elements/Components must be self closing `<div />` or matched closing `<div></div>`
- Capital tags are treated as components and will throw if now registered `<ComponentA></ComponentA>` or `<ComponentA />`
- Content between tags is treated as children. Will return an array unless only a single child node (text,elem, or expression)

### Attributes & Properties

- `<input value="Hello World" />` - static string property
- `<input value='Hello World' />` - static string property
- `<input disabled />` - static boolean property
- `<input value=${val} />` - dynamic property
- `<input value="${val}" />` - dynamic property
- `<input value='${val}' />` - dynamic property
- `<input value="Hello ${val}" />` - mixed dynamic string property
- `<input onEvent=${} />` — Delgated event listener (Not Reactive)
- `<input onevent=${} />` - Delegated event (depracated) (Not Reactive)
- `<input on:event=${} />` - event listener on the element (Not Reactive)
- `<input prop:value=${} />` — DOM property
- `<input attr:class=${} />` — string attribute
- `<input bool:disabled=${} />` — boolean attribute
- `<input ...${} />` — spread properties
- `<input ref=${} />` — ref (Not Reactive)
- `<div children=${} />` attribute is used only if the element has no child nodes (JSX-like behavior).

## Reactivity and props

- Props that are functions with zero arguments and not `on` events or `ref` are treated as reactive accessors and are auto-wrapped (so you can pass `() => value` and the runtime will call it for updates).
- For properties that accept a function that are not `on` events. You may need to add `()=>` to ensure the function doesn't get wrapped.

```ts
import { sld, run } from "solid-html";

const [count, setCount] = createSignal(0);

sld`<button count=${() => count()}  />`;
//or just the signal/memo
sld`<button count=${count} />`;

//Add ()=> to avoid Counter possibly getting auto-wrapped
sld`<Route component=${() => Counter} />`;

//Using the run helper with getters. (TS support)
//reactive props must be read in getters.
const [show, setShow] = createSignal(true);
sld`<div>
  ${run(Show)({
    get when() {
      return show();
    },
    children: "Hello World",
  })}
</div>`;
//vs
sld`<div>
  <Show when=${show}>
    Hello World
  </Show>
</div>`;
```

## JSX vs SLD

| Feature              | Solid JSX                                         | `sld` Tagged Template                                      |
| :------------------- | :------------------------------------------------ | :--------------------------------------------------------- |
| **Fragments**        | Required: `<>...</>` for multiple root nodes      | **None needed**: Returns a flat array of nodes             |
| **Dot Notation**     | Supported: `<Input.Label />`                      | **Supported**: `.` is valid in identifier tokens           |
| **Mixed Attributes** | Requires template literals: `class=${`btn ${p}`}` | **Native**: `class="btn ${p}"` is handled by the parser    |
| **Spread Syntax**    | `<div {...props} />`                              | `<div ...${props} />`                                      |
| **Comments**         | `{/* JSX Comment */}`                             | `<!-- -->` (Stripped by parser)                            |
| **Raw Text Tags**    | Escaping or `innerHTML` required                  | **Automatic**: `<style>`/`<script>` treat children as text |
| **Whitespace**       | JSX-style stripping                               | Contextual: Trims between tags, preserves inside text      |
