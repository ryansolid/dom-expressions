import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';

const plugins = [
  nodeResolve({
    extensions: ['.js', '.ts']
  }),
  babel({
    extensions: ['.js', '.ts'],
    presets: ["@babel/preset-typescript"],
    exclude: 'node_modules/**',
    retainLines: true
  })
]

export default {
  input: 'src/index.ts',
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