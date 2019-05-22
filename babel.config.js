// babel.config.js
module.exports = {
  presets: [['@babel/preset-env', {targets: {node: 'current'}}]],
  plugins: [['babel-plugin-jsx-dom-expressions', {moduleName: './runtime.js'}]]
};