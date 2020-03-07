module.exports = {
  output: 'test/runtime.js',
  variables: {
    imports: [ `import wrap, { sample as ignore } from 's-js'` ],
    includeContext: false
  }
}