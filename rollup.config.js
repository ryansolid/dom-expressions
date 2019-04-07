import nodeResolve from 'rollup-plugin-node-resolve';

const plugins = [nodeResolve()]

export default {
  input: 'src/index.js',
  output: [{
    file: 'lib/dom-expressions.js',
    format: 'cjs',
    exports: 'named'
  }, {
    file: 'dist/dom-expressions.js',
    format: 'es'
  }],
  plugins
}