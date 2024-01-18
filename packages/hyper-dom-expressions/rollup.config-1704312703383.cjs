'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var babel = require('@rollup/plugin-babel');
var nodeResolve = require('@rollup/plugin-node-resolve');

const plugins = [
  nodeResolve({
    extensions: [".js", ".ts"]
  }),
  babel({
    extensions: [".js", ".ts"],
    babelHelpers: "bundled",
    presets: ["@babel/preset-typescript"],
    exclude: "node_modules/**",
    babelrc: false,
    configFile: false,
    retainLines: true
  })
];

var rollup_config = {
  input: "src/index.ts",
  output: [
    {
      file: "lib/hyper-dom-expressions.js",
      format: "cjs"
    },
    {
      file: "dist/hyper-dom-expressions.js",
      format: "es"
    }
  ],
  plugins
};

exports.default = rollup_config;
