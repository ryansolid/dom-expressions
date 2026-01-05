const babel = require("@babel/core");
const plugin = require("../index");

const code = `
const template = (
  <html>
    <head>
      <Assets />
    </head>
    <body>
      <App />
    </body>
  </html>
);
`;

const baseOptions = {
  builtIns: ["For", "Show"],
  hydratable: true,
  contextToCustomElements: true,
  staticMarker: "@once"
};

function transform(options) {
  return babel.transformSync(code, {
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ["jsx"] },
    plugins: [[plugin, options]]
  }).code;
}

describe("head hydration", () => {
  it("keeps head hydratable in ssr output", () => {
    const output = transform({
      ...baseOptions,
      moduleName: "r-server",
      generate: "ssr"
    });

    expect(output).not.toMatch(/NoHydration/);
  });

  it("keeps head hydratable in dom output", () => {
    const output = transform({
      ...baseOptions,
      moduleName: "r-dom",
      generate: "dom"
    });

    expect(output).not.toMatch(/NoHydration/);
  });

  it("keeps head hydratable in dynamic output", () => {
    const output = transform({
      ...baseOptions,
      moduleName: "r-dom",
      generate: "dynamic",
      renderers: [
        {
          name: "dom",
          elements: ["html", "head", "body"],
          moduleName: "r-dom"
        }
      ]
    });

    expect(output).not.toMatch(/NoHydration/);
  });
});
