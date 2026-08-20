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
    requireImportSource: false,
    serverComponents: true
  },
  title: "Convert JSX",
  fixtures: path.join(__dirname, "__ssr_server_components_fixtures__"),
  snapshot: true
});
