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

  describe.each(["dom", "ssr"])("in MathML content for the %s transform", generate => {
    test.each([
      ["inside <math>", `<math><style>{"<&"}</style></math>`],
      ["inside <math> through an element", `<math><mrow><style>{"<&"}</style></mrow></math>`],
      ["inside a top-level MathML element", `<mrow><style>{"<&"}</style></mrow>`],
      ["inside MathML passed as component children", `<Comp><math><style>{"<&"}</style></math></Comp>`],
      ["inside <math> nested in <svg>", `<svg><math><style>{"<&"}</style></math></svg>`],
      ["inside <foreignObject> nested in <math>", `<math><foreignObject><style>{"<&"}</style></foreignObject></math>`],
      ["inside <annotation-xml> without an HTML encoding", `<math><annotation-xml><style>{"<&"}</style></annotation-xml></math>`]
    ])("escapes <style> %s", (_, jsx) => {
      const output = transform(`const template = ${jsx};`, generate);

      expect(output).toContain("<style>&lt;&amp;");
    });

    test("escapes <script> inside <math>", () => {
      const output = transform(`const template = <math><script>{"<&"}</script></math>;`, generate);

      expect(output).toContain("<script>&lt;&amp;");
    });

    test.each(["mi", "mo", "mn", "ms", "mtext"])(
      "does not escape <style> inside MathML text integration point <%s>",
      tagName => {
        const output = transform(
          `const template = <math><${tagName}><style>{"<&"}</style></${tagName}></math>;`,
          generate
        );

        expect(output).toContain("<style><&");
      }
    );

    test("does not escape <style> inside <annotation-xml> with an HTML encoding", () => {
      const output = transform(
        `const template = <math><annotation-xml encoding="text/html"><style>{"<&"}</style></annotation-xml></math>;`,
        generate
      );

      expect(output).toContain("<style><&");
    });

    test("escapes <style> inside <mtext> nested in <svg>", () => {
      const output = transform(
        `const template = <svg><mtext><style>{"<&"}</style></mtext></svg>;`,
        generate
      );

      expect(output).toContain("<style>&lt;&amp;");
    });
  });
});
