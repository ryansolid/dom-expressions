const path = require("path");
const pluginTester = require("babel-plugin-tester").default;
const plugin = require("../index");

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: "r-server",
    builtIns: ["For", "Show"],
    generate: "ssr",
    wrapConditionals: true,
    contextToCustomElements: true,
    staticMarker: "@once",
    requireImportSource: false
  },
  title: "Convert JSX",
  fixtures: path.join(__dirname, "__ssr_fixtures__"),
  snapshot: true
});
