# DOM Expressions

[![Build Status](https://github.com/ryansolid/dom-expressions/workflows/DOMExpressions%20CI/badge.svg)](https://github.com/ryansolid/dom-expressions/actions/workflows/main-ci.yml)
[![Coverage Status](https://img.shields.io/coveralls/github/ryansolid/dom-expressions.svg?style=flat)](https://coveralls.io/github/ryansolid/dom-expressions?branch=main)
[![NPM Version](https://img.shields.io/npm/v/dom-expressions.svg?style=flat)](https://www.npmjs.com/package/dom-expressions)
![](https://img.shields.io/bundlephobia/minzip/dom-expressions.svg?style=flat)
![](https://img.shields.io/npm/dt/dom-expressions.svg?style=flat)
[![Gitter](https://img.shields.io/gitter/room/dom-expressions/community)](https://gitter.im/dom-expressions/community)

DOM Expressions is a Rendering Runtime for reactive libraries that do fine grained change detection. These libraries rely on concepts like Observables and Signals rather than Lifecycle functions and the Virtual DOM. Standard JSX transformers are not helpful to these libraries as they need to evaluate their expressions in isolation to avoid re-rendering unnecessary parts of the DOM.

This package wraps libraries like KnockoutJS or MobX and use them independent of their current render systems using a small library to render pure DOM expressions. This approach has been proven to be incredibly fast, dominating the highest rankings in the [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark).

It is designed to be used with a companion render API. Currently there is a JSX Babel Plugin, and Tagged Template Literals, and HyperScript runtime APIs. Most developers will not use this package directly. It is intended to help author your own Reactive Libraries and not to be used directly in projects.

## Example Implementations

- [Solid](https://github.com/ryansolid/solid): A declarative JavaScript library for building user interfaces.
- [mobx-jsx](https://github.com/ryansolid/mobx-jsx): Ever wondered how much more performant MobX is without React? A lot.
- [vuerx-jsx](https://github.com/ryansolid/vuerx-jsx): Ever wondered how much more performant Vue is without Vue? ...renderer built on @vue/reactivity
- [ko-jsx](https://github.com/ryansolid/ko-jsx): Knockout JS with JSX rendering.
- [s-jsx](https://github.com/ryansolid/s-jsx): Testbed for trying new techniques in the fine grained space.

## Runtime Generator

Dom Expressions is designed to allow you to create a runtime to be tree shakeable. It does that by using "babel-plugin-transform-rename-import" to rename the import to your reactive core file. Setup the babel plugin and then `export * from "dom-expressions/src/runtime"`from your runtime. Be sure to not exclude the dom-expressions node_module.

```js
{
  plugins: [
    [
      "babel-plugin-transform-rename-import",
      {
        original: "rxcore",
        replacement: "../src/core"
      }
    ]
  ];
}
```
What is the reactive core file. It exports an object with the methods required by the runtime.
Example:

```js
import { untrack } from "@solidjs/signals";

export const sharedConfig = {};

export function createComponent(Comp, props) {
  return untrack(() => Comp(props));
}


export { createRoot as root, createRenderEffect as effect, createMemo as memo, getOwner, untrack, merge as mergeProps } from "@solidjs/signals";
```

## Runtime Renderers

Once you have generated a runtime it can be used with companion render APIs:

### JSX

[Babel Plugin JSX DOM Expressions](https://github.com/ryansolid/dom-expressions/blob/main/packages/babel-plugin-jsx-dom-expressions) is by far the best way to use this library. Pre-compilation lends to the best performance since the whole template can be analyzed and optimal compiled into the most performant JavaScript. This allows for not only the most performant code, but the cleanest and the smallest.

### Tagged Template

If precompilation is not an option Tagged Template Literals are the next best thing. [Lit DOM Expressions](https://github.com/ryansolid/dom-expressions/blob/main/packages/lit-dom-expressions) provides a similar experience to the JSX, compiling templates at runtime into similar code on first run. This option is the largest in size and memory usage but it keeps most of the performance and syntax from the JSX version.

### HyperScript

While not as performant as the other options this library provides a mechanism to expose a HyperScript version. [Hyper DOM Expressions](https://github.com/ryansolid/dom-expressions/blob/main/packages/hyper-dom-expressions) offers the greatest flexibility working with existing tooling for HyperScript and enables pure JS DSLs.

## Work in Progress

This is still a work in progress. My goal here is to better understand and generalize this approach to provide non Virtual DOM alternatives to developing web applications.
