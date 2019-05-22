module.exports = {
  output: 'test/runtime.js',
  variables: {
    imports: [ `import {
      comp as wrap, sample, root, cleanup, setContext, lookupContext,
      getContextOwner as currentContext, makeDataNode
    } from '@ryansolid/s-js'` ],
    handlePromise: `p => {
      const [processing, register] = lookupContext('suspense');
      const s = makeDataNode();
      register(processing() + 1);
      p.then(v => s.next(v)).finally(() => register(processing() - 1));
      return s.current.bind(s);
    }`,
    SuspenseContext: `{
      id: 'suspense', initFn: () => {
        const s = makeDataNode(0);
        return [s.current.bind(s), s.next.bind(s)];
      }
    }`,
    includeContext: true
  }
}