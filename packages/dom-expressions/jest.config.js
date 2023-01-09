module.exports = {
  collectCoverageFrom: ["src/**/*.js"],
  "testEnvironment": "jsdom",
  projects: [
    {
      displayName: "browser",
      testMatch: ["<rootDir>/test/dom/*.spec.js(x)?"],
      transform: {
        "^.+\\.[t|j]sx?$": require.resolve("./test/transform-dom")
      }
    },
    {
      displayName: "server",
      testMatch: ["<rootDir>/test/ssr/*.spec.js(x)?"],
      transform: {
        "^.+\\.[t|j]sx?$": require.resolve("./test/transform-dom")
      }
    },
    {
      displayName: "universal",
      testMatch: ["<rootDir>/test/universal/*.spec.js(x)?"],
      transform: {
        "^.+\\.[t|j]sx?$": require.resolve("./test/transform-universal")
      }
    }
  ]
};
