# HyperCache DOM Expressions

[![Build Status](https://img.shields.io/travis/com/ryansolid/dom-expressions.svg?style=flat)](https://travis-ci.com/ryansolid/dom-expressions)
[![NPM Version](https://img.shields.io/npm/v/hypercache-dom-expressions.svg?style=flat)](https://www.npmjs.com/package/hypercache-dom-expressions)
![](https://img.shields.io/bundlephobia/minzip/hypercache-dom-expressions.svg?style=flat)
![](https://img.shields.io/npm/dt/hypercache-dom-expressions.svg?style=flat)

This package is a Runtime API built for [DOM Expressions](https://github.com/ryansolid/dom-expressions) to provide a faster HyperScript DSL for reactive libraries that do fine grained change detection. While the JSX plugin [Babel Plugin JSX DOM Expressions](https://github.com/ryansolid/dom-expressions/blob/master/packages/babel-plugin-jsx-dom-expressions) is more optimized with precompilation, smaller size, and cleaner syntax, this HyperScript solution has the flexibility of not being compiled, the debugability and simplicity of not doing dynamic code generation, and performance on par with the fastest vDOM libraries.

## Status

I'm still working out API details and performance profiling.
