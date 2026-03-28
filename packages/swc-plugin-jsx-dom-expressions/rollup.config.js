import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import cleanup from "rollup-plugin-cleanup";

export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/index.cjs",
      format: "cjs"
    },
    {
      file: "dist/index.js",
      format: "es"
    }
  ],
  plugins: [nodeResolve(), commonjs(), cleanup()],
  external: []
};
