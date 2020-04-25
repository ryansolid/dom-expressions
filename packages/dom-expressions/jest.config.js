module.exports = {
  collectCoverageFrom: [
    'src/runtime.js'
  ],
  transform: {
    "^.+\\.[t|j]sx?$": "babel-jest"
  }
}