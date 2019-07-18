module.exports = {
  output: 'test/runtime.js',
  variables: {
    imports: [ `import {
      comp as wrap, getContextOwner as currentContext,
    } from '@ryansolid/s-js'` ],
    includeContext: true,
    classComponents: true
  }
}