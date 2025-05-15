const path = require("path");
const pluginTester = require("babel-plugin-tester").default;
const t = require("@babel/types");
const plugin = require("../index");

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: "r-dom",
    builtIns: ["For", "Show"],
    generate: "dom",
    wrapConditionals: true,
    contextToCustomElements: true,
    staticMarker: "@once",
    requireImportSource: "r-dom"
  },
  title: "Convert JSX",
  fixtures: path.join(__dirname, "__dom_require_import_source_fixtures__"),
  snapshot: true,
  babelOptions: {
    // requireImportSource should not prevent this plugin from running
    plugins: [
      {
        visitor: {
          Program: {
            exit: path => {
              path.pushContainer("body", [t.expressionStatement(t.stringLiteral("fin"))]);
            }
          }
        }
      }
    ]
  }
});
