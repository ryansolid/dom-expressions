"use strict";

const fs = require("fs");

describe("binding loader", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("falls back to WASI when native addons cannot load", () => {
    const forceWasi = process.env.NAPI_RS_FORCE_WASI;
    delete process.env.NAPI_RS_FORCE_WASI;
    const existsSync = fs.existsSync;
    jest.spyOn(fs, "existsSync").mockImplementation(file => {
      const filename = String(file);
      return !filename.endsWith(".node") && !filename.endsWith(".wasi.cjs") && existsSync(file);
    });

    const nativePackage =
      process.platform === "darwin"
        ? `@dom-expressions/compiler-darwin-${process.arch}`
        : process.platform === "linux"
          ? `@dom-expressions/compiler-linux-${process.arch}-gnu`
          : "@dom-expressions/compiler-win32-x64-msvc";

    jest.doMock(
      nativePackage,
      () => {
        throw new Error("Cannot load native addon because loading addons is disabled");
      },
      { virtual: true }
    );
    jest.doMock(
      "@dom-expressions/compiler-wasm32-wasi",
      () => ({
        transform() {
          return { code: "wasm", map: null };
        }
      }),
      { virtual: true }
    );

    try {
      const compiler = require("..");
      expect(compiler.transform("const value = 1")).toEqual({ code: "wasm", map: null });
    } finally {
      if (forceWasi === undefined) delete process.env.NAPI_RS_FORCE_WASI;
      else process.env.NAPI_RS_FORCE_WASI = forceWasi;
    }
  });
});
