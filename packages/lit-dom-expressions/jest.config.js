module.exports = {
  testEnvironment: "jsdom",
  collectCoverageFrom: [
    'dist/lit-dom-expressions.js'
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(dom-expressions)/)"
  ]
}
