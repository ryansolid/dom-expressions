module.exports = {
  env: {
    test: {
      presets: [["@babel/preset-env", { targets: { node: "current" } }]],
      plugins: [
        [
          "babel-plugin-transform-rename-import",
          {
            original: "rxcore",
            replacement: "../test/core"
          }
        ],
        [
          "babel-plugin-jsx-dom-expressions",
          { moduleName: "./s-jsx.js", wrapConditionals: true }
        ]
      ]
    }
  }
};
