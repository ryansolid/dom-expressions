module.exports = {
  output: 'test/runtime.js',
  includeTypes: true,
  variables: {
    imports: [ `import S from 's-js'` ],
    computed: 'S',
    sample: 'S.sample',
    root: 'S.root',
    cleanup: 'S.cleanup'
  }
}