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
    omitLastClosingTag: false,
    omitQuotes: false,
    omitAttributeSpacing: false,
  },
  title: 'Convert JSX omitAttributeSpacing: false',
  fixtures: path.join(__dirname, '__dom_omit_attribute_spacing_no_omit_fixtures__'),
  snapshot: true
});
