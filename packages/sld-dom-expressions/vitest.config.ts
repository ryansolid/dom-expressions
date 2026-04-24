import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { preview } from "@vitest/browser-preview";
import path from "path"

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: preview(),
      // headless: true,
      screenshotFailures: false,
      instances: [{ browser: "chromium" }],
    },
    // environment:"node",
    // include:[
    //   "./tests/parse.test.ts",
    //   "./tests/tokenize.test.ts"
    // ]
  },
  resolve: {
    alias: {
      // Option 1: Using an absolute path (Recommended)
      'rxcore': path.resolve(__dirname, './tests/core'),
      
      // Option 2: Using a relative path (Works in most setups)
      // 'rxcore': './test/core'
    },
  },
});
