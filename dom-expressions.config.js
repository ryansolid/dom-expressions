module.exports = {
  output: 'test/runtime.js',
  variables: {
    imports: [ `import {
      comp as wrap, sample, root, cleanup, setContext, lookupContext,
      getContextOwner as currentContext, makeDataNode
    } from '@ryansolid/s-js'` ],
    SuspenseContext: `{
      id: 'suspense', initFn: () => {
        const s = makeDataNode(0);
        return [s.current.bind(s), s.next.bind(s)];
      }
    }`,
    includeContext: true
  }
}