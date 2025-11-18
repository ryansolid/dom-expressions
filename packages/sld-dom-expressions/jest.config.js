module.exports = {
  testEnvironment: "jsdom",
  collectCoverageFrom: [
    'dist/sld-dom-expressions.js'
  ],
  transform: {
    "^.+\\.[t|j]sx?$": require.resolve("../dom-expressions/test/transform-dom")
  },
  transformIgnorePatterns: [
    "node_modules/(?!(dom-expressions)/)"
  ]
}
