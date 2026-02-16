import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { preview } from "@vitest/browser-preview";

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
});
