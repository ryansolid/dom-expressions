// babel.config.js
module.exports = {
  presets: ['@babel/preset-env'],
  plugins: [['babel-plugin-jsx-dom-expressions', {moduleName: './runtime.js'}]]
};