# DOM Expressions

[![Build Status](https://img.shields.io/travis/com/ryansolid/dom-expressions.svg?style=flat)](https://travis-ci.com/ryansolid/dom-expressions)
[![Coverage Status](https://img.shields.io/coveralls/github/ryansolid/dom-expressions.svg?style=flat)](https://coveralls.io/github/ryansolid/dom-expressions?branch=master)
[![NPM Version](https://img.shields.io/npm/v/dom-expressions.svg?style=flat)](https://www.npmjs.com/package/dom-expressions)
![](https://img.shields.io/bundlephobia/minzip/dom-expressions.svg?style=flat)
![](https://img.shields.io/david/ryansolid/dom-expressions.svg?style=flat)
![](https://img.shields.io/npm/dt/dom-expressions.svg?style=flat)

This package is to provide a Rendering Runtime for reactive libraries that do fine grained change detection.  These libraries rely on concepts like Observables and Signals rather than Lifecycle functions and the Virtual DOM. Standard JSX transformers are not helpful to these libraries as they need to evaluate their expressions in isolation to avoid re-rendering unnecessary parts of the DOM.

This library wraps libraries like KnockoutJS or MobX and use them independent of their current render systems using a small library to render pure DOM expressions. It is designed to be used with a companion render interface. So far JSX and HyperScript are available.

## Example Implementations
* [ko-jsx](https://github.com/ryansolid/ko-jsx): Knockout JS with JSX rendering.
* [mobx-jsx](https://github.com/ryansolid/mobx-jsx): Ever wondered how much more performant MobX is without React? A lot.
* [Solid](https://github.com/ryansolid/solid): A declarative JavaScript library for building user interfaces.

## Runtime API

To create a runtime you pass an object with the following methods to the createRuntime method:

### wrap(fn) : void

This is called around all expressions. This is typically where you wrap the expression with a computation in the desired library and handle any value preparsing. Your wrap method is expected to call fn with the previously evaluated value if the arity is 1 to allow for reducing computations.

### root(fn) : any

This indicates a new disposable context. The fn should be provided a dispose method that can be called to free all computations in the context.

### sample(fn) : any

A method that causes dependencies within not to be tracked.

### cleanup(fn) : void

This method should register a cleanup method to be called when the context is released.

## JSX

This library's companion is [Babel Plugin JSX DOM Expressions](https://github.com/ryansolid/babel-plugin-jsx-dom-expressions). This by far the best way to use this library. Pre-compilation lends to the best performance since the whole template can be analyzed and optimal compiled into the most performant JavaScript.

## HyperScript

While not as performant this library provides a mechanism to expose a HyperScript version that doesn't require JSX compilation. Keep in mind you need to wrap expressions in functions if you want them to be observed. For attributes since wrapping in a function is the only indicator of reactivity, passing a non-event function as a value requires wrapping it in a function.

```js
import { createRuntime, createHyperScript } from 'dom-expressions';

const r = createRuntime(/* arguments */);
/* createHyperScript(runtime, options = {delegateEvents: true}) */
const h = createHyperScript(r);

// Later ....
h('div.main', ["Hello", () => state.name]);
```

There are also several small differences but generally follows HyperScript conventions. All attributes are props (so use className) and to indicate attributes wrap in 'attrs' object. Ref works React-like by passing a function.

Components/Templates are just functions so no need to wrap them in an h function. Just call them inline. With HyperScript custom bindings need to be registered using ```h.registerBinding(key, fn)``` and control flow is handled through ```h.each(listFn, itemFn, options)```, ```h.when(conditionFn, itemFn, options)```, ```h.portal(anchorFn, viewFn, options)```, ```h.suspend(conditionFn, viewFn, options)```. HyperScript also supports fragments. Simply pass only the children array to the h function.

## Work in Progress

This is still a work in progress. My goal here is to better understand and generalize this approach to provide non Virtual DOM alternatives to developing web applications.