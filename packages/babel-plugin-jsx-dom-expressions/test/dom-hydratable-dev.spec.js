const path = require("path");
const pluginTester = require("babel-plugin-tester").default;
const plugin = require("../index");

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: "r-dom",
    builtIns: ["For", "Show"],
    generate: "dom",
    hydratable: true,
    dev: true,
    contextToCustomElements: true,
    staticMarker: "@once"
  },
  title: "Convert JSX (dev hydratable)",
  fixtures: path.join(__dirname, "__dom_hydratable_dev_fixtures__"),
  snapshot: true
});
