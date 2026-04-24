import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom"
  },
  resolve: {
    alias: {
      rxcore: path.resolve(__dirname, "./tests/core")
    }
  }
});
