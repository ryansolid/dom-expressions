module.exports = {
  output: 'test/runtime.js',
  variables: {
    imports: [ `import wrap from 's-js'` ],
    includeContext: false,
    classComponents: true
  }
}