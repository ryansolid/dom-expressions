module.exports = {
  collectCoverageFrom: [
    'dist/hypercache-dom-expressions.js'
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(dom-expressions)/)"
  ]
}