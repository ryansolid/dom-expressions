const path = require('path')
const pluginTester = require('babel-plugin-tester').default;
const plugin = require('../index');

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: 'r-dom',
    builtIns: ['For', 'Show'],
    generate: "dom",
    wrapConditionals: true,
    contextToCustomElements: true,
    staticMarker: "@once",
    requireImportSource: false,
    inlineStyles: false,
  },
  title: 'Convert JSX',
  fixtures: path.join(__dirname, '__dom_no_inline_styles_fixtures__'),
  snapshot: true
});
