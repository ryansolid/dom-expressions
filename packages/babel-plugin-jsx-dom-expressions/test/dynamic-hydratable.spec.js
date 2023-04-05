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
          "namespace:tag",
          "html",
          "head",
          "body",
          "title",
          "meta",
          "link",
          "footer",
          "script"
        ],
        moduleName: "r-dom"
      }
    ],
    hydratable: true,
    contextToCustomElements: true,
    staticMarker: "@once"
  },
  title: "Convert JSX",
  fixtures: path.join(__dirname, "__dom_hydratable_fixtures__"),
  snapshot: true
});
