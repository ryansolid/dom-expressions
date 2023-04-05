const path = require("path");
const pluginTester = require("babel-plugin-tester").default;
const plugin = require("../index");

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: "r-dom",
    builtIns: ["For", "Show"],
    generate: "dynamic",
    renderers: [
      {
        name: "dom",
        moduleName: "r-dom",
        elements: [
          "table",
          "tbody",
          "div",
          "h1",
          "span",
          "header",
          "footer",
          "slot",
          "my-element",
          "module",
          "input",
          "button",
          "a",
          "svg",
          "rect",
          "x",
          "y",
          "linearGradient",
          "stop",
          "style",
          "li",
          "ul",
          "label",
          "text",
          "namespace:tag"
        ]
      }
    ],
    staticMarker: "@once",
    contextToCustomElements: true,
    wrapConditionals: true
  },
  title: "Convert JSX",
  fixtures: path.join(__dirname, "__dom_fixtures__"),
  snapshot: true
});
