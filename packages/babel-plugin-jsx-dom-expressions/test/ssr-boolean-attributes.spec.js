const { transformSync } = require("@babel/core");
const plugin = require("../index");

describe("SSR boolean property attributes", () => {
  test("serializes dynamic camelCase boolean properties as boolean HTML attributes", () => {
    const { code } = transformSync(
      `const template = (
        <>
          <input readOnly={props.readOnly} />
          <video playsInline={props.playsInline} />
          <audio preservesPitch={props.preservesPitch} />
        </>
      );`,
      {
        configFile: false,
        babelrc: false,
        plugins: [[plugin, { moduleName: "r-server", generate: "ssr" }]]
      }
    );

    expect(code).toContain('_$ssrAttribute("readonly", props.readOnly, true)');
    expect(code).toContain('_$ssrAttribute("playsinline", props.playsInline, true)');
    expect(code).toContain(
      '_$ssrAttribute("preservespitch", _$escape(props.preservesPitch, true), false)'
    );
  });
});
