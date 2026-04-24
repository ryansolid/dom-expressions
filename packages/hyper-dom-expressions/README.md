# Hyper DOM Expressions

[![Build Status](https://github.com/ryansolid/dom-expressions/workflows/DOMExpressions%20CI/badge.svg)](https://github.com/ryansolid/dom-expressions/actions/workflows/main-ci.yml)
[![NPM Version](https://img.shields.io/npm/v/hyper-dom-expressions.svg?style=flat)](https://www.npmjs.com/package/hyper-dom-expressions)
![](https://img.shields.io/bundlephobia/minzip/hyper-dom-expressions.svg?style=flat)
![](https://img.shields.io/npm/dt/hyper-dom-expressions.svg?style=flat)

HyperScript DSL for [DOM Expressions](https://github.com/ryansolid/dom-expressions), targeting fine-grained reactive libraries that want a no-build authoring syntax.

> **Performance note.** Of the four DOM-expressions frontends, hyperscript is the **slowest**. Every `h(...)` call materializes a small tree at runtime, versus the precompiled constants and cloned templates emitted by [`babel-plugin-jsx-dom-expressions`](https://github.com/ryansolid/dom-expressions/blob/main/packages/babel-plugin-jsx-dom-expressions), or the parse-once-then-clone caching of [`lit-dom-expressions`](https://github.com/ryansolid/dom-expressions/blob/main/packages/lit-dom-expressions). Both hyper and lit run with no build step — if you just want a no-tooling authoring syntax, prefer `lit-dom-expressions`; it's considerably faster. Hyperscript's niche is interop with React-style JSX transforms and other ecosystems that already emit `h(tag, props, …children)` calls.

## Compatible Libraries

- [Solid](https://github.com/ryansolid/solid)
- [ko-jsx](https://github.com/ryansolid/ko-jsx)
- [mobx-jsx](https://github.com/ryansolid/mobx-jsx)

## Getting Started

Install alongside DOM Expressions and a reactive library. For Solid:

```sh
npm install @solidjs/signals dom-expressions hyper-dom-expressions
```

Initialize `h` against the runtime:

```js
import { createHyperScript } from "hyper-dom-expressions";
import * as r from "dom-expressions/src/client";

const h = createHyperScript(r);
```

Consumers typically re-export a pre-wired `h` — Solid exposes `solid-js/h`.

## The `h` contract

`h(...)` is **lazy**. Every call returns a zero-arity thunk tagged with an internal symbol; the thunk materializes DOM (or invokes the component) under the current reactive owner when called. Laziness is what keeps per-row render effects inside `For`/`mapArray` rooted under their own owners rather than the parent `insert` effect.

```js
const tree = h("div", h(Counter)); // thunk
tree(); // materializes DOM
```

Mount via `r.render`. Pass the thunk directly; `render` invokes it inside its root so the whole tree materializes under that owner:

```js
import { render } from "dom-expressions/src/client";

const App = () => h("main", h(Home));

render(h(App), document.getElementById("app"));
```

Inside `h(...)` composition works without ceremony: nested `h(...)` children are invoked once at consumption, and user-supplied accessors (`() => expr`) route through `r.insert` so they stay reactive.

## Components, props, and children

- **Props are uniform.** Zero-arity function props are routed through `dynamicProperty` so reading them invokes the accessor and returns the current value — the same getter-style convention Solid's JSX compiler produces. Event props (`on…`) and higher-arity functions (e.g. a `For` render callback) pass through unchanged.

- **`props.children`** mirrors the caller's input:

  | call shape | `props.children` |
  | --- | --- |
  | `h(Comp)` | `undefined` |
  | `h(Comp, { children: v })` | `v` |
  | `h(Comp, null, a)` | `a` |
  | `h(Comp, null, a, b, c)` | `[a, b, c]` |

  Nested `h(...)` thunks flow through as-is and auto-invoke once when consumed.

- **Reactive consumption.** `h("p", props.children)` reads `props.children` once at render time. For reactive re-reads, the consumer wraps in its own accessor: `h("p", () => props.children)`. `r.insert` tracks the read and re-runs on change. This mirrors Solid JSX, which compiles `{props.children}` to `insert(el, () => props.children)`.

- **Fragments** are either plain arrays (`[h(...), h(...)]`) or the built-in `h.Fragment` component.

- **JSX-compiler interop.** Components compiled by `babel-plugin-jsx-dom-expressions` can be invoked from inside `h(...)`. Their bodies see the same `props` shape they expect from compiled call sites (getters for dynamic props, `children` as a value / function / array), so typical library components (e.g. Solid Router routes) work. The reverse direction — passing a hyperscript thunk to compiled call sites expecting an element — is not supported.

## Example

```js
import { createHyperScript } from "hyper-dom-expressions";
import * as r from "dom-expressions/src/client";
import { createSignal, mapArray } from "@solidjs/signals";

const h = createHyperScript(r);

const For = props => mapArray(() => props.each, props.children);

const App = () => {
  const [rows, setRows] = createSignal([
    { id: 1, label: "one" },
    { id: 2, label: "two" }
  ]);
  return h(
    "table.table",
    h(
      "tbody",
      h(For, { each: rows }, row =>
        h(
          "tr",
          h("td.col-md-1", () => row().id),
          h("td.col-md-4", () => row().label)
        )
      )
    )
  );
};

r.render(h(App), document.getElementById("main"));
```

## Differences from JSX

- Refs are passed as a function prop (`ref: el => { … }`).
- Reactivity is explicit: wrap expressions in a function when they should be tracked (`() => count()`), including when forwarding a component prop (`h("p", () => props.foo)`).
- Fragments are arrays (or `h.Fragment`).
- Tag selectors understand `#id` and `.class` shorthands (`h("div#main.sel", …)`).
