import { defineConfig } from "vite";
import { transformAsync } from "@babel/core";
import dom from "babel-plugin-jsx-dom-expressions";
export default defineConfig({
  plugins: [
    {
      async transform(code, id) {
        if (!/.[tj]sx$/.test(id)) return;
        const result = await transformAsync(code, {
          plugins: [
            [
              dom,
              {
                moduleName: "./dom",
                generate: "dom",
                hydratable: false,
                delegateEvents: true,
                delegatedEvents: [],
                builtIns: [],
                requireImportSource: false,
                wrapConditionals: true,
                omitNestedClosingTags: false,
                contextToCustomElements: false,
                staticMarker: "@once",
                effectWrapper: "effect",
                memoWrapper: "memo",
                validate: true
              }
            ]
          ]
        });
        return result.code;
      }
    }
  ],
  esbuild: { jsx: "preserve" },
  resolve: {
    alias: {
      rxcore: "/src/rxcore.js"
    }
  }
});
