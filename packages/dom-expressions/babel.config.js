module.exports = {
  presets: [["@babel/preset-env", { targets: { node: "current" } }]],
  plugins: [
    [
      "babel-plugin-transform-rename-import",
      {
        original: "rxcore",
        replacement: __dirname + "/core"
      }
    ],
    ["babel-plugin-jsx-dom-expressions", { moduleName: "./custom", generate: "universal" }]
  ]
};
