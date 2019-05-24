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
          let counter = 0,
            first = true;
          const s = makeDataNode(),
            increment = () => {
              (++counter === 1 && !first) && s.next();
              first = false;
            },
            decrement = () => {
              (--counter === 0)  && s.next();
            },
            count = () => {
              s.current();
              return counter;
            }
          return {increment, decrement, count};
        }
      }`,
      registerSuspense: `() => {
        const c = SuspenseContext.initFn();
        setContext(SuspenseContext.id, c);
        return c.count;
      }`
    },
    includeContext: true
  }
}