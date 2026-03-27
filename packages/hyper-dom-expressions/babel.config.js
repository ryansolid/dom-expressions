// babel.config.js
const path = require('path');

module.exports = {
  presets: ['@babel/preset-env'],
  plugins: [
    [
      "babel-plugin-transform-rename-import",
      {
        original: "rxcore",
        replacement: path.join(__dirname, '..', 'dom-expressions', 'test', 'core')
      }
    ]
  ]
};