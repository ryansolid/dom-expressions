const path = require('path')
const pluginTester = require('babel-plugin-tester').default;
const plugin = require('../index');

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: 'r-dom',
    builtIns: ['For'],
    generate: "ssr",
    hydratable: true,
    delegateEvents: true,
    wrapConditionals: true,
    wrapFragments: true,
    contextToCustomElements: true,
    staticMarker: "@once"
  },
  title: 'Convert JSX',
  fixtures: path.join(__dirname, '__ssr_hydratable_fixtures__'),
  snapshot: true
});
