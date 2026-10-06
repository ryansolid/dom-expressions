const babel = require("@babel/core");
const plugin = require("../index");

function transform(source, generate = "dom") {
  return babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [
      [
        plugin,
        {
          generate,
          moduleName: generate === "ssr" ? "r-server" : "r-dom",
          requireImportSource: false
        }
      ]
    ]
  }).code;
}

describe("raw-text element children", () => {
  test.each(["style", "script"])(
    "does not HTML-escape a static expression inside <%s>",
    tagName => {
      const output = transform(`const template = <${tagName}>{"<&"}</${tagName}>;`);

      expect(output).toContain(`<${tagName}><&`);
      expect(output).not.toContain("&lt;&amp;");
    }
  );

  test.each(["dom", "ssr"])(
    "uses decoded JSX entity text inside raw-text elements for the %s transform",
    generate => {
      const output = transform("const template = <style>&amp;</style>;", generate);

      expect(output).toContain("<style>&");
      expect(output).not.toContain("<style>&amp;");
    }
  );

  test.each(["div", "title", "textarea"])(
    "continues to HTML-escape a static expression inside <%s>",
    tagName => {
      const output = transform(`const template = <${tagName}>{"<&"}</${tagName}>;`);

      expect(output).toContain(`<${tagName}>&lt;&amp;`);
    }
  );

  describe.each(["dom", "ssr"])("in SVG content for the %s transform", generate => {
    test.each([
      ["inside <svg>", `<svg><style>{"<&"}</style></svg>`],
      ["inside a top-level SVG element", `<g><style>{"<&"}</style></g>`],
      ["inside SVG passed as component children", `<Comp><g><style>{"<&"}</style></g></Comp>`]
    ])("escapes <style> %s", (_, jsx) => {
      const output = transform(`const template = ${jsx};`, generate);

      expect(output).toContain("<style>&lt;&amp;");
    });

    test("does not escape <style> inside <foreignObject>", () => {
      const output = transform(
        `const template = <svg><foreignObject><style>{"<&"}</style></foreignObject></svg>;`,
        generate
      );

      expect(output).toContain("<style><&");
    });
  });
});
