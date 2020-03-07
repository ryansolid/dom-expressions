const path = require('path')
const pluginTester = require('babel-plugin-tester').default;
const plugin = require('../index');

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: 'r-dom',
    builtIns: ['For'],
    generate: "ssr",
    delegateEvents: true,
    wrapFragments: true,
    contextToCustomElements: true
  },
  title: 'Convert JSX',
  fixtures: path.join(__dirname, '__ssr_fixtures__'),
  snapshot: true
});
