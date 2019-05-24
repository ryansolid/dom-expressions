module.exports = {
  output: 'test/runtime.js',
  variables: {
    imports: [ `import {
      comp as wrap, sample, root, cleanup, getContextOwner as currentContext,
      setContext, makeDataNode
    } from '@ryansolid/s-js'` ],
    declarations: {
      SuspenseContext: `{
        id: 'suspense', initFn: () => {
          let counter = 0;
          const s = makeDataNode(),
            store = {
              increment: () => ++counter === 1 && !store.initializing && s.next(),
              decrement: () => --counter === 0 && s.next(),
              suspended: () => {
                s.current();
                return counter;
              },
              initializing: true
            }
          return store;
        }
      }`,
      registerSuspense: `(fn) => {
        wrap(() => {
          const c = SuspenseContext.initFn();
          setContext(SuspenseContext.id, c);
          fn(c);
          c.initializing = false;
        });
      }`
    },
    includeContext: true
  }
}