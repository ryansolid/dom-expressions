module.exports = {
  collectCoverageFrom: ["src/**/*.js"],
  transform: {
    "^.+\\.[t|j]sx?$": "babel-jest"
  }
}