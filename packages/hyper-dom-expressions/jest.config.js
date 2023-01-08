module.exports = {
  testEnvironment: "jsdom",
  collectCoverageFrom: [
    'dist/hyper-dom-expressions.js'
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(dom-expressions)/)"
  ]
}
