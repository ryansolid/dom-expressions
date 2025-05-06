'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var babel = require('@rollup/plugin-babel');
var nodeResolve = require('@rollup/plugin-node-resolve');
var path = require('path');

const plugins = [
  nodeResolve({
    extensions: [".js", ".ts"],
    rootDir: path.join(process.cwd(), "../.."),
    moduleDirectories: ["node_modules", "packages"]
  }),
  babel({
    extensions: ['.js', '.ts'],
    babelHelpers: "bundled",
    presets: ["@babel/preset-typescript"],
    exclude: 'node_modules/**',
    babelrc: false,
    configFile: false,
    retainLines: true
  })
];

var rollup_config = {
  input: "src/index.ts",
  external: ["@babel/plugin-syntax-jsx", "@babel/helper-module-imports", "@babel/types", "html-entities", "validate-html-nesting"],
  output: {
    file: "index.js",
    format: "cjs",
    exports: "auto"
  },
  plugins
};

exports.default = rollup_config;
