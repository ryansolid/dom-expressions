import { describe, it, expect } from "vitest";
import {
  BOOLEAN_PROP,
  ELEMENT_NODE,
  EXPRESSION_NODE,
  MIXED_PROP,
  ROOT_NODE,
  STATIC_PROP,
  TEXT_NODE,
  EXPRESSION_PROP,
  SPREAD_PROP,
  parse,
} from "../src/parse";
import { rawTextElements, voidElements } from "../src/util";
import { tokenize } from "../src/tokenize";

function jsx(strings: TemplateStringsArray, ...values: any[]) {
  return parse(tokenize(strings, rawTextElements), voidElements);
}

describe("Simple AST", () => {
  it("simple text", () => {
    const ast = jsx`Hello World!`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [{ type: TEXT_NODE, value: "Hello World!" }],
    });
  });

  it("simple element", () => {
    const ast = jsx`<div></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [{ type: ELEMENT_NODE, name: "div", props: [], children: [] }],
    });
  });

  it("text content", () => {
    const ast = jsx`<div>Hello</div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [{ type: TEXT_NODE, value: "Hello" }],
        },
      ],
    });
  });

  it("expression inside text", () => {
    const name = "World";
    const ast = jsx`<div>Hello ${name}</div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            { type: TEXT_NODE, value: "Hello " },
            { type: EXPRESSION_NODE, value: 0 },
          ],
        },
      ],
    });
  });

  it("self-closing", () => {
    const ast = jsx`<input />`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [{ type: ELEMENT_NODE, name: "input", props: [], children: [] }],
    });
  });

  it("nested elements", () => {
    const ast = jsx`
      <div>
        <span>text</span>
      </div>
    `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            {
              type: ELEMENT_NODE,
              name: "span",
              props: [],
              children: [{ type: TEXT_NODE, value: "text" }],
            },
          ],
        },
      ],
    });
  });
});

describe("Attributes", () => {
  it("string attribute", () => {
    const ast = jsx`<div id="app"></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [{ name: "id", type: STATIC_PROP, value: "app", quote: '"' }],
          children: [],
        },
      ],
    });
  });

  it("string attribute single quoted", () => {
    const ast = jsx`<div id='app'></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [{ name: "id", type: STATIC_PROP, value: "app", quote: "'" }],
          children: [],
        },
      ],
    });
  });

  it("boolean attribute", () => {
    const ast = jsx`<input checked />`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,

          name: "input",
          props: [{ name: "checked", type: BOOLEAN_PROP, value: true }],
          children: [],
        },
      ],
    });
  });

  it("boolean attribute", () => {
    const ast = jsx`<button checked></button>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,

          name: "button",
          props: [{ name: "checked", type: BOOLEAN_PROP, value: true }],
          children: [],
        },
      ],
    });
  });

  it("expression attribute", () => {
    const id = "my-id";
    const ast = jsx`<div id=${id}></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,

          name: "div",
          props: [{ name: "id", type: EXPRESSION_PROP, value: 0 }],
          children: [],
        },
      ],
    });
  });

  it("quoted expression attribute", () => {
    const id = "my-id";
    const ast = jsx`<div id="${id}"></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,

          name: "div",
          props: [{ name: "id", type: EXPRESSION_PROP, value: 0, quote: '"' }],
          children: [],
        },
      ],
    });
  });

  it("single quoted expression attribute", () => {
    const id = "my-id";
    const ast = jsx`<div id='${id}'></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,

          name: "div",
          props: [{ name: "id", type: EXPRESSION_PROP, value: 0, quote: "'" }],
          children: [],
        },
      ],
    });
  });

  it("mixed attribute (string + expression)", () => {
    const active = true;
    const ast = jsx`<div class="btn ${active ? "active" : ""}"></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [
            {
              name: "class",
              type: MIXED_PROP,
              value: ["btn ", 0],
              quote: '"',
            },
          ],
          children: [],
        },
      ],
    });
  });

  it("mixed attribute (string + expression) with single quotes", () => {
    const active = true;
    const ast = jsx`<div class='btn ${active ? "active" : ""}'></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [
            {
              name: "class",
              type: MIXED_PROP,
              value: ["btn ", 0],
              quote: "'",
            },
          ],
          children: [],
        },
      ],
    });
  });

  it("mixed attribute (2 expression) with whitespace", () => {
    const active = true;
    const ast = jsx`<div class="${active ? "active" : ""}  ${"1"}"></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [
            {
              name: "class",
              type: MIXED_PROP,
              value: [0, "  ", 1],
              quote: '"',
            },
          ],
          children: [],
        },
      ],
    });
  });

  it("mixed attributes", () => {
    const ast = jsx`
        <h1 title="${1} John ${"Smith"}"></h1>
      `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "h1",
          props: [
            {
              name: "title",
              type: MIXED_PROP,
              value: [0, " John ", 1],
              quote: '"',
            },
          ],
          children: [],
        },
      ],
    });
  });

  it("multiple attributes", () => {
    const value = "test";
    const ast = jsx`<input type="text" value=${value} disabled />`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "input",
          props: [
            { name: "type", type: STATIC_PROP, value: "text", quote: '"' },
            { name: "value", type: EXPRESSION_PROP, value: 0 },
            { name: "disabled", type: BOOLEAN_PROP, value: true },
          ],
          children: [],
        },
      ],
    });
  });

  it("spread attribute with ...", () => {
    const id = "my-id";
    const ast = jsx`<div ...${id}></div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [{ type: SPREAD_PROP, value: 0 }],
          children: [],
        },
      ],
    });
  });
});

describe("whitespace handling", () => {
  it("preserves whitespace in text nodes in root", () => {
    const ast = jsx`  Hello <div>   Hello   World   </div> !   `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        { type: TEXT_NODE, value: "  Hello " },
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [{ type: TEXT_NODE, value: "   Hello   World   " }],
        },
        { type: TEXT_NODE, value: " !   " },
      ],
    });
  });

  it("trims leading and trailing whitespace-only text nodes at root", () => {
    const ast = jsx`
    <div>Hello World</div>
    `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [{ type: TEXT_NODE, value: "Hello World" }],
        },
      ],
    });
  });

  it("preserves whitespace in text nodes", () => {
    const ast = jsx`<div>   Hello   World   </div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [{ type: TEXT_NODE, value: "   Hello   World   " }],
        },
      ],
    });
  });
  it("preserves whitespace in text nodes with elements", () => {
    const ast = jsx`<div>
       Hello World
       <span>!</span> 
       </div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            {
              type: TEXT_NODE,
              value: `
       Hello World
       `,
            },
            {
              type: ELEMENT_NODE,
              name: "span",
              props: [],
              children: [{ type: TEXT_NODE, value: "!" }],
            },
          ],
        },
      ],
    });
  });

  it("preserves whitespace in mixed text nodes", () => {
    const name = "User";
    const ast = jsx`<div>  Hello ${name}  !  </div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            { type: TEXT_NODE, value: "  Hello " },
            { type: EXPRESSION_NODE, value: 0 },
            { type: TEXT_NODE, value: "  !  " },
          ],
        },
      ],
    });
  });

  it("trims whitespace-only text nodes around expressions", () => {
    const name = "User";
    const ast = jsx`<div>
      ${name}
    </div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [{ type: EXPRESSION_NODE, value: 0 }],
        },
      ],
    });
  });

  it("trims whitespace-only text nodes around expressions", () => {
    const name = "User";
    const ast = jsx`   ${name}   `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: TEXT_NODE,
          value: "   ",
        },
        {
          type: EXPRESSION_NODE,
          value: 0,
        },
        {
          type: TEXT_NODE,
          value: "   ",
        },
      ],
    });
  });

  it("filters only beginning and trailing whitespace in mixed text nodes", () => {
    const name = "User";
    const ast = jsx`<div>  ${"Hello"}  ${name}  !  </div>`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            { type: EXPRESSION_NODE, value: 0 },
            { type: TEXT_NODE, value: "  " },
            { type: EXPRESSION_NODE, value: 1 },
            { type: TEXT_NODE, value: "  !  " },
          ],
        },
      ],
    });
  });
});

describe("Complex Examples", () => {
  it("JSX with multiple expressions", () => {
    const title = "App";
    const content = "Hello";
    const count = 42;
    const ast = jsx`
      <div id="root">
        <h1>${title}</h1>
        <p>${content} - ${count}</p>
      </div>
    `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [{ name: "id", type: STATIC_PROP, value: "root", quote: '"' }],
          children: [
            {
              type: ELEMENT_NODE,
              name: "h1",
              props: [],
              children: [{ type: EXPRESSION_NODE, value: 0 }],
            },
            {
              type: ELEMENT_NODE,
              name: "p",
              props: [],
              children: [
                { type: EXPRESSION_NODE, value: 1 },
                { type: TEXT_NODE, value: " - " },
                { type: EXPRESSION_NODE, value: 2 },
              ],
            },
          ],
        },
      ],
    });
  });

  it("list-like structure", () => {
    const items = ["a", "b", "c"];
    const ast = jsx`
      <ul>
        <li>${items[0]}</li>
        <li>${items[1]}</li>
        <li>${items[2]}</li>
      </ul>
    `;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "ul",
          props: [],
          children: [
            {
              type: ELEMENT_NODE,
              name: "li",
              props: [],
              children: [{ type: EXPRESSION_NODE, value: 0 }],
            },
            {
              type: ELEMENT_NODE,
              name: "li",
              props: [],
              children: [{ type: EXPRESSION_NODE, value: 1 }],
            },
            {
              type: ELEMENT_NODE,
              name: "li",
              props: [],
              children: [{ type: EXPRESSION_NODE, value: 2 }],
            },
          ],
        },
      ],
    });
  });
});

describe("Specialized Element AST", () => {
  it("void elements: children", () => {
    // Note: br is void, img is void. They should be siblings, not nested.
    const ast = jsx`<div><img src="test.png" >Children should get <span>wiped</span></img></div>`;

    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "div",
          props: [],
          children: [
            {
              type: ELEMENT_NODE,
              name: "img",
              props: [
                {
                  name: "src",
                  type: STATIC_PROP,
                  value: "test.png",
                  quote: '"',
                },
              ],
              children: [],
            },
          ],
        },
      ],
    });
  });

  it("raw text elements: textarea ignoring content", () => {
    // The content inside <textarea> is treated as a single TEXT_NODE
    const ast = jsx`<textarea><div class="fake">${0}</div></textarea>`;

    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "textarea",
          props: [],
          children: [
            {
              type: TEXT_NODE,
              value: '<div class="fake">',
            },
            { type: EXPRESSION_NODE, value: 0 },
            {
              type: TEXT_NODE,
              value: "</div>",
            },
          ],
        },
      ],
    });
  });

  it("complex mixed props in void elements", () => {
    const theme = "dark";
    const ast = jsx`<input class="btn ${theme}" disabled />`;

    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        {
          type: ELEMENT_NODE,
          name: "input",
          props: [
            {
              name: "class",
              type: MIXED_PROP,
              value: ["btn ", 0], // 0 is index of 'theme' in expressions
              quote: '"',
            },
            {
              name: "disabled",
              type: BOOLEAN_PROP,
              value: true,
            },
          ],
          children: [], // Input is self-closing/void
        },
      ],
    });
  });
});

describe("Edge Cases", () => {
  it("empty template", () => {
    const ast = jsx``;
    expect(ast).toEqual({ type: ROOT_NODE, children: [] });
  });
  it("only expressions", () => {
    const a = 1;
    const b = 2;
    const ast = jsx`${a}${b}`;
    expect(ast).toEqual({
      type: ROOT_NODE,
      children: [
        { type: EXPRESSION_NODE, value: 0 },
        { type: EXPRESSION_NODE, value: 1 },
      ],
    });
  });
});

describe("Errors", () => {
  it("error on open tag", () => {
    expect(() => jsx`<div`).toThrow();
  });

  it("error on mismatched tag", () => {
    expect(() => jsx`<div></span>`).toThrow();
  });

  it("error on extra <", () => {
    expect(() => jsx`<div><</span>`).toThrow();
  });

  it("error on bad tag name", () => {
    expect(() => jsx`<1div><</1div>`).toThrow();
  });

  it("error on unclosed tags", () => {
    expect(() => jsx`<div>`).toThrow();
  });

  it("error on spread without expression", () => {
    expect(() => jsx`<div ... bool></div>`).toThrow();
  });

  it("error on unmatched close", () => {
    expect(() => jsx`</div>`).toThrow();
  });
});

describe("Advanced Parser Edge Cases", () => {
  describe("Spread Attributes", () => {
    it("handles multiple spread attributes", () => {
      const props1 = { class: "first" };
      const props2 = { id: "second" };
      const ast = jsx`<div ...${props1} ...${props2}></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              { type: SPREAD_PROP, value: 0 },
              { type: SPREAD_PROP, value: 1 },
            ],
            children: [],
          },
        ],
      });
    });

    it("handles spread with mixed other attributes", () => {
      const props = { class: "dynamic", "data-test": "value" };
      const ast = jsx`<div id="static" ...${props} required></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              { name: "id", type: STATIC_PROP, value: "static", quote: '"' },
              { type: SPREAD_PROP, value: 0 },
              { name: "required", type: BOOLEAN_PROP, value: true },
            ],
            children: [],
          },
        ],
      });
    });

    it("handles spread in quoted attribute context", () => {
      const props = { class: "test" };
      const ast = jsx`<div class="prefix-${props}-suffix"></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              {
                name: "class",
                type: MIXED_PROP,
                value: ["prefix-", 0, "-suffix"],
                quote: '"',
              },
            ],
            children: [],
          },
        ],
      });
    });
  });

  describe("Complex Mixed Attributes", () => {
    it("handles multiple expressions in single attribute", () => {
      const firstName = "John";
      const lastName = "Doe";
      const ast = jsx`<div title="${firstName} ${lastName}"></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              {
                name: "title",
                type: MIXED_PROP,
                value: [0, " ", 1],
                quote: '"',
              },
            ],
            children: [],
          },
        ],
      });
    });

    it("handles complex mixed expressions with functions", () => {
      const getValue = () => "test";
      const prefix = "pre-";
      const ast = jsx`<div class="${prefix}${getValue()}"></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              {
                name: "class",
                type: MIXED_PROP,
                value: [0, 1],
                quote: '"',
              },
            ],
            children: [],
          },
        ],
      });
    });

    it("handles attribute with only expressions", () => {
      const part1 = "hello";
      const part2 = "world";
      const ast = jsx`<div class="${part1}${part2}"></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [
              {
                name: "class",
                type: MIXED_PROP,
                value: [0, 1],
                quote: '"',
              },
            ],
            children: [],
          },
        ],
      });
    });
  });

  describe("Special Tag Names and Namespaces", () => {
    it("handles custom elements with hyphens", () => {
      const ast = jsx`<my-custom-element attr="value"></my-custom-element>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "my-custom-element",
            props: [{ name: "attr", type: STATIC_PROP, value: "value", quote: '"' }],
            children: [],
          },
        ],
      });
    });

    it("handles namespaced tags", () => {
      const ast = jsx`<svg:rect x="10" y="20"></svg:rect>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "svg:rect",
            props: [
              { name: "x", type: STATIC_PROP, value: "10", quote: '"' },
              { name: "y", type: STATIC_PROP, value: "20", quote: '"' },
            ],
            children: [],
          },
        ],
      });
    });

    it("handles foreignObject in SVG", () => {
      const ast = jsx`<svg><foreignObject><div>HTML content</div></foreignObject></svg>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "svg",
            props: [],
            children: [
              {
                type: ELEMENT_NODE,
                name: "foreignObject",
                props: [],
                children: [
                  {
                    type: ELEMENT_NODE,
                    name: "div",
                    props: [],
                    children: [{ type: TEXT_NODE, value: "HTML content" }],
                  },
                ],
              },
            ],
          },
        ],
      });
    });
  });

  describe("Advanced Text and Expression Handling", () => {
    it("handles complex text with multiple adjacent expressions", () => {
      const items = ["a", "b", "c"];
      const separator = ", ";
      const ast = jsx`${items[0]}${separator}${items[1]}${separator}${items[2]}`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          { type: EXPRESSION_NODE, value: 0 },
          { type: EXPRESSION_NODE, value: 1 },
          { type: EXPRESSION_NODE, value: 2 },
          { type: EXPRESSION_NODE, value: 3 },
          { type: EXPRESSION_NODE, value: 4 },
        ],
      });
    });

    it("handles text with HTML entities", () => {
      const ast = jsx`<div>Use &lt; and &gt; for brackets</div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [],
            children: [{ type: TEXT_NODE, value: "Use &lt; and &gt; for brackets" }],
          },
        ],
      });
    });

    it("handles text with numeric character references", () => {
      const ast = jsx`<div>Copyright &#169; 2023</div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [],
            children: [{ type: TEXT_NODE, value: "Copyright &#169; 2023" }],
          },
        ],
      });
    });
  });

  describe("Complex Nesting and Structure", () => {
    it("handles deeply nested structures", () => {
      const ast = jsx`
        <div>
          <section>
            <article>
              <header>
                <h1>Title</h1>
              </header>
              <main>
                <p>Content</p>
              </main>
              <footer>
                <small>Footer</small>
              </footer>
            </article>
          </section>
        </div>
      `;

      const divChild = ast.children[0] as any;
      const sectionChild = divChild.children[0] as any;
      const articleChild = sectionChild.children[0] as any;

      expect(articleChild.name).toBe("article");
      expect(articleChild.children.length).toBe(3);
    });

    it("handles sibling elements at root", () => {
      const ast = jsx`<div>First</div><span>Second</span><p>Third</p>`;

      expect(ast.children).toHaveLength(3);
      expect((ast.children[0] as any).name).toBe("div");
      expect((ast.children[1] as any).name).toBe("span");
      expect((ast.children[2] as any).name).toBe("p");
    });

    it("handles mixed text and elements at root", () => {
      const ast = jsx`Before<div>Element</div>After`;

      expect(ast.children).toHaveLength(3);
      expect((ast.children[0] as any).type).toBe(TEXT_NODE);
      expect((ast.children[1] as any).type).toBe(ELEMENT_NODE);
      expect((ast.children[2] as any).type).toBe(TEXT_NODE);
    });
  });

  describe("Void and Raw Text Elements", () => {
    it("handles void elements with attributes and self-closing syntax", () => {
      const ast = jsx`<img src="test.jpg" alt="Test Image" />`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "img",
            props: [
              { name: "src", type: STATIC_PROP, value: "test.jpg", quote: '"' },
              { name: "alt", type: STATIC_PROP, value: "Test Image", quote: '"' },
            ],
            children: [],
          },
        ],
      });
    });

    it("handles void elements without explicit slash", () => {
      const ast = jsx`<br></br>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "br",
            props: [],
            children: [],
          },
        ],
      });
    });

    it("handles script element with complex content", () => {
      const ast = jsx`<script>
        function test() {
          return x < y && z > w;
        }
      </script>`;

      expect(((ast.children[0] as any).children[0] as any).value).toContain(
        "return x < y && z > w;",
      );
    });

    it("handles style element with CSS content", () => {
      const ast = jsx`<style>
        .class > .child { color: red; }
        @media (max-width: 768px) {
          .responsive { display: block; }
        }
      </style>`;

      const styleContent = ((ast.children[0] as any).children[0] as any).value;
      expect(styleContent).toContain(".class > .child");
      expect(styleContent).toContain("@media");
    });
  });

  describe("Attribute Namespaces and Special Props", () => {
    it("handles on: namespace for events", () => {
      const handler = () => {};
      const ast = jsx`<div on:click=${handler}></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [{ name: "on:click", type: EXPRESSION_PROP, value: 0 }],
            children: [],
          },
        ],
      });
    });

    it("handles prop: and attr: namespaces", () => {
      const value = "test";
      const ast = jsx`<input prop:value=${value} attr:title="Title"></input>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "input",
            props: [
              { name: "prop:value", type: EXPRESSION_PROP, value: 0 },
              { name: "attr:title", type: STATIC_PROP, value: "Title", quote: '"' },
            ],
            children: [],
          },
        ],
      });
    });

    it("handles ref attribute", () => {
      const ref = (el: HTMLElement) => {};
      const ast = jsx`<div ref=${ref}></div>`;

      expect(ast).toEqual({
        type: ROOT_NODE,
        children: [
          {
            type: ELEMENT_NODE,
            name: "div",
            props: [{ name: "ref", type: EXPRESSION_PROP, value: 0 }],
            children: [],
          },
        ],
      });
    });
  });

  describe("Error Recovery and Edge Cases", () => {
    it("handles attributes with special characters", () => {
      const ast = jsx`<div data-attr_with.special:chars="value"></div>`;

      expect(((ast.children[0] as any).props[0] as any).name).toBe("data-attr_with.special:chars");
    });

    it("handles unusual attribute values", () => {
      const ast = jsx`<div data-empty="" data-null="${null}" data-undefined="${undefined}"></div>`;

      expect(((ast.children[0] as any).props[0] as any).value).toBe("");
    });

    it("handles deeply nested spread and mixed attributes", () => {
      const baseProps = { class: "base", id: "test" };
      const additionalProps = { "data-info": "additional" };
      const dynamicClass = "dynamic";

      const ast = jsx`<div 
        class="static ${dynamicClass}"
        ...${baseProps}
        ...${additionalProps}
        id="override"
      ></div>`;

      const elementProps = (ast.children[0] as any).props;
      expect(elementProps).toHaveLength(4);
      expect(elementProps[0].type).toBe(MIXED_PROP);
      expect(elementProps[1].type).toBe(SPREAD_PROP);
      expect(elementProps[2].type).toBe(SPREAD_PROP);
      expect(elementProps[3].type).toBe(STATIC_PROP);
    });
  });
});
