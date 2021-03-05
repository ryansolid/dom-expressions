const path = require('path')
const pluginTester = require('babel-plugin-tester').default;
const plugin = require('../index');

pluginTester({
  plugin,
  pluginOptions: {
    moduleName: 'r-dom',
    builtIns: ['For', 'Show'],
    generate: "dom",
    wrapConditionals: false,
    delegateEvents: false,
    effectWrapper: false,
    memoWrapper: false,
  },
  title: 'Convert JSX',
  fixtures: path.join(__dirname, '__dom_wrapperless_fixtures__'),
  snapshot: true
});
