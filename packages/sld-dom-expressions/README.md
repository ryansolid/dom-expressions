# sld

sld is a no-build, no-JSX tagged-template library for SolidJS and designed to work with template tooling (editor syntax highlighting, formatters, etc.).

## Quick overview

- `sld` - default tagged template instance with the built-in component registry.
  - `sld.define({CompA})` - creates a new instance from the existing instance and combines registered componenets
  - `sld.sld` - self reference so all tags can start with `sld` for potential tooling
- `SLD({CompA})` - factory function which includes built-in components
- `createSLD({CompA})` - factory function which doesn't includes built-in components
- `run(CompA)(props)` helper function for createComponent to get better ts. Must manually do getters on props.



## Basic usage

Use the default `sld` tag for templates and the `SLD` factory to create a local instance.

```ts
import { sld } from "solid-html";

// default instance:
function Counter() {
  const [count, setCount] = createSignal(0);
  return sld`<button onClick=${() => setCount((v) => v + 1)}>
    ${() => count()}
  </button>`;
}
```

## Reactivity and props

- Props that are functions with zero arguments and not `on` events or `ref` are treated as reactive accessors and are auto-wrapped (so you can pass `() => value` and the runtime will call it for updates).
- For properties that accept a function that are not `on` events. You may need to add ()=> to ensure the function doesn't get wrapped.

```ts
import { sld, once } from "solid-html";

const [count, setCount] = createSignal(0);

sld`<button count=${() => count()}  />`;
//or just
sld`<button count=${count} />`;

//Add ()=> to avoid Counter possibly getting auto-wrapped
sld`<Route component=${()=>Counter} />

```


## Template rules and syntax

- Templates are static: tag names and attribute names must be literal (not dynamic expressions). Use spread and the Dyanmic component if necessary.
- Tags can be self closing (like JSX)
- Attribute binding syntax (Same as solid):
  - `<input value="Hello World" />` - static string property
  - `<input disabled />` - static boolean property
  - `<input value=${val} />` - dynamic property
  - `<input value="Hello ${val}" />` - mixed dynamic string property
  - `onEvent=${}` or `on:event` — event listeners (Not Reactive)
  - `ref=${}` — ref (Not Reactive)
  - `prop:value=${}` — DOM property
  - `attr:class=${}` — string attribute
  - `bool:class=${}` — boolean attribute
  - `...${}` — spread properties
  - `${}` in content — child value
- Components must be registered to be used as tags in templates.
- `children` attribute is used only if the element has no child nodes (JSX-like behavior).
- Component/attribute names are case-sensitive when registered via `sld.define` or `SLD`.

## Built-In Components

- For
- Index
- Show
- Match
- Switch
- Suspense
- ErrorBoundary


## Advanced: Creating custom SLD instances

`SLD(components)` returns a tagged template bound to the provided component registry. This is useful for scoping or providing non-global components to templates. `SLD` includes the built-in components. use `createSLD` if you do not want to include the built-in components.

```ts
const My = SLD({ Counter, Router: HashRouter });
My`<Counter />`;

//This can also be inline with self refercing sld property
SLD({ Counter, Router: HashRouter }).sld`<Counter />


```
