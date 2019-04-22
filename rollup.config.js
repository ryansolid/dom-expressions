import nodeResolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

const plugins = [
  nodeResolve({
    extensions: ['.js', '.ts']
  }),
  typescript({
    useTsconfigDeclarationDir: true
  })
]

export default [{
  input: 'src/index.ts',
  output: {
    file: 'dist/dom-expressions.js',
    format: 'es'
  },
  plugins
}, {
  input: 'dist/dom-expressions.js',
  output: {
    file: 'lib/dom-expressions.js',
    format: 'cjs',
    exports: 'named'
  }
}]