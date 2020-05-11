const path = require('path')
const pluginTester = require('babel-plugin-tester').default;
const plugin = require('../index');

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: 'r-dom',
    builtIns: ['For'],
    generate: "dom-ssr",
    contextToCustomElements: true,
    staticMarker: "@once"
  },
  title: 'Convert JSX',
  fixtures: path.join(__dirname, '__dom_ssr_fixtures__'),
  snapshot: true
});
