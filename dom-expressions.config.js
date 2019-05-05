module.exports = {
  output: 'runtime.js',
  variables: {
    imports: [ `import S from 's-js'` ],
    computed: 'S',
    sample: 'S.sample',
    root: 'S.root',
    cleanup: 'S.cleanup'
  }
}