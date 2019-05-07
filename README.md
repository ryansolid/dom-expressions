# DOM Expressions

[![Build Status](https://img.shields.io/travis/com/ryansolid/dom-expressions.svg?style=flat)](https://travis-ci.com/ryansolid/dom-expressions)
[![Coverage Status](https://img.shields.io/coveralls/github/ryansolid/dom-expressions.svg?style=flat)](https://coveralls.io/github/ryansolid/dom-expressions?branch=master)
[![NPM Version](https://img.shields.io/npm/v/dom-expressions.svg?style=flat)](https://www.npmjs.com/package/dom-expressions)
![](https://img.shields.io/bundlephobia/minzip/dom-expressions.svg?style=flat)
![](https://img.shields.io/david/ryansolid/dom-expressions.svg?style=flat)
![](https://img.shields.io/npm/dt/dom-expressions.svg?style=flat)

DOM Expressions is a Rendering Runtime for reactive libraries that do fine grained change detection. These libraries rely on concepts like Observables and Signals rather than Lifecycle functions and the Virtual DOM. Standard JSX transformers are not helpful to these libraries as they need to evaluate their expressions in isolation to avoid re-rendering unnecessary parts of the DOM.

This package wraps libraries like KnockoutJS or MobX and use them independent of their current render systems using a small library to render pure DOM expressions. This approach has been proven to be incredibly fast, dominating the highest rankings in the [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark).

It is designed to be used with a companion render API. Currently there is a JSX Babel Plugin, and Tagged Template Literals, and HyperScript runtime APIs.

## Example Implementations
* [Solid](https://github.com/ryansolid/solid): A declarative JavaScript library for building user interfaces.
* [ko-jsx](https://github.com/ryansolid/ko-jsx): Knockout JS with JSX rendering.
* [mobx-jsx](https://github.com/ryansolid/mobx-jsx): Ever wondered how much more performant MobX is without React? A lot.

## Runtime Generator

Dom Expressions is designed to allow the runtime to be tree shakeable by generating a special version ahead of time so static module analysis provided by your bundler can do it's thing. To create a generate runtime you must provide symbols to create the final js file and the output path. We do this through a dom-expressions.config.js.

```js
module.exports = {
  output: 'path-to-output/filename.js',
  variables: {
    imports: [ `import S from 's-js'` ],
    computed: 'S',
    sample: 'S.sample',
    root: 'S.root',
    cleanup: 'S.cleanup'
  }
}
```

These symbols should reference an observable API with the following functionality:

### computed(fn) : void

This is used to wrap all expressions in computations. Your wrap method is expected to call fn with the previously evaluated value if the arity is 1 to allow for reducing computations.

### root(fn) : any

This indicates a new disposable context. The fn should be provided a dispose method that can be called to free all computations in the context.

### sample(fn) : any

A method that causes dependencies within not to be tracked.

### cleanup(fn) : void

This method should register a cleanup method to be called when the context is released.

## Runtime Renderers

Once you have generated a runtime it can be used with companion render APIs:

### JSX

[Babel Plugin JSX DOM Expressions](https://github.com/ryansolid/babel-plugin-jsx-dom-expressions) is by far the best way to use this library. Pre-compilation lends to the best performance since the whole template can be analyzed and optimal compiled into the most performant JavaScript. This allows for not only the most performant code, but the cleanest and the smallest.

### Tagged Template

If precompilation is not an option Tagged Template Literals are the next best thing. [Lit DOM Expressions](https://github.com/ryansolid/lit-dom-expressions) provides a similar experience to the JSX, compiling templates at runtime into similar code on first run. This option is the largest in size and memory usage but it keeps most of the performance and syntax from the JSX version.

### HyperScript

While not as performant as the other options this library provides a mechanism to expose a HyperScript version. [Hyper DOM Expressions](https://github.com/ryansolid/hyper-dom-expressions) offers the greatest flexibility working with existing tooling for HyperScript and enables pure JS DSLs.

## Work in Progress

This is still a work in progress. My goal here is to better understand and generalize this approach to provide non Virtual DOM alternatives to developing web applications.