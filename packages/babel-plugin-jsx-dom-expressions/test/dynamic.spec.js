const path = require("path");
const pluginTester = require("babel-plugin-tester").default;
const plugin = require("../index");

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: "r-custom",
    builtIns: ["For", "Show"],
    generate: "dynamic",
    staticMarker: "@once",
    renderers: [
      {
        name: "dom",
        elements: [
          "table",
          "tbody",
          "div",
          "h1",
          "span",
          "header",
          "footer",
          "slot",
          "my-el",
          "my-element",
          "module",
          "input",
          "img",
          "iframe",
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
          "namespace:tag",
          "path",
          "noscript",
          "select",
          "option",
          "video"
        ],
        moduleName: "r-dom"
      }
    ],
    contextToCustomElements: true,
    wrapConditionals: true
  },
  title: "Convert JSX",
  fixtures: path.join(__dirname, "__dynamic_fixtures__"),
  snapshot: true
});
