const path = require("path");
const pluginTester = require("babel-plugin-tester").default;
const plugin = require("../index");

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: "r-custom",
    builtIns: ["For", "Show"],
    generate: "dynamic",
    staticMarker: "@once"
  },
  title: "Convert JSX",
  fixtures: path.join(__dirname, "__universal_fixtures__"),
  snapshot: true
});
