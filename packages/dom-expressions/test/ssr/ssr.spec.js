/**
 * @jest-environment jsdom
 */
import * as r from "../../src/server";
import * as S from "s-js";
import { createPlugin } from "seroval";
import { sharedConfig } from "rxcore";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

const fixture = `<div data-hk="0" id="main" data-id="12" aria-role="button" class="static selected" checked style="color:red" ><h1 custom-attr="1" disabled title="Hello John" style="background-color:red;width:100%" class="selected"><a href="/">Welcome</a></h1></div>`;
const fixture2 = `<span data-hk="0" class="Hello John" > Hello &lt;div/> </span>`;
const fixture3 = `<span> Hello &lt;div/><script nonce=\"1a2s3d4f5g\">window._$HY||(e=>{let t=e=>e&&e.hasAttribute&&(e.hasAttribute(\"data-hk\")?e:t(e.host&&e.host.nodeType?e.host:e.parentNode));[\"click\", \"input\"].forEach((o=>document.addEventListener(o,(o=>{if(!e.events)return;let s=t(o.composedPath&&o.composedPath()[0]||o.target);s&&!e.completed.has(s)&&e.events.push([s,o])}))))})(_$HY={events:[],completed:new WeakSet,r:{},fe(){}});</script><!--xs--><link rel=\"modulepreload\" href=\"chunk.js\"></span>`;
const fixture4 = `<span > Hello &lt;div/> </span>`;

const Comp1 = () => {
  const selected = S.data(true),
    something = undefined,
    welcoming = S.data("Hello John"),
    color = S.data("red"),
    colorUndefinedFn = () => undefined,
    colorUndefined = undefined,
    results = {
      "data-id": "12",
      "aria-role": "button",
      class: "static",
      onClick: () => console.log("never"),
      get checked() {
        return selected();
      }
    },
    dynamic = () => ({
      "custom-attr": "1"
    });

  const props = { something: !!1, value: 1 }

  return r.ssrElement(
    "div",
    {
      id: "main",
      ...results,
      classList: { selected: selected() },
      style: { color: color() },
      disabled: !selected()
    },
    r.ssrElement(
      "h1",
      {
        ...dynamic(),
        disabled: selected(),
        title: welcoming(),
        style: {
          "background-color": color(),
          "border-color": colorUndefined,
          "color": colorUndefinedFn(),
          [props.something === true ? "width" : 'height']: `${props.value * 100}%`,
        },
        classList: {
          selected: selected(),
          [something]: true
        }
      },
      r.ssr`<a href="/">Welcome</a>`,
      false
    ),
    true
  );
};

const Comp2 = () => {
  const greeting = "Hello",
    name = "<div/>";
  return r.ssrElement(
    "span",
    { class: "Hello", classList: { John: true } },
    ` ${r.escape(greeting)} ${r.escape(name)} `,
    true
  );
};

const Comp3 = () => {
  const greeting = "Hello",
    name = "<div/>";
  r.useAssets(() => r.ssr`<link rel="modulepreload" href="chunk.js">`)
  return r.ssr`<span> ${r.escape(greeting)} ${r.escape(name)}${r.HydrationScript()}${r.getAssets()}</span>`;
};

const Comp4 = () => {
  const greeting = "Hello",
    name = "<div/>";
  return r.ssrElement("span", null, ` ${r.escape(greeting)} ${r.escape(name)} `);
};

const Comp5 = () => {
  const greeting = ["Hello"],
    name = ["<div/>"];
  return r.ssr`<span > ${r.escape(greeting)} ${r.escape(name)} </span>`
};

describe("renderToString", () => {
  it("renders as expected", async () => {
    let res = r.renderToString(Comp1);
    expect(res).toBe(fixture);
    res = r.renderToString(Comp2);
    expect(res).toBe(fixture2);
    res = r.renderToString(Comp3, { nonce: "1a2s3d4f5g" });
    expect(res).toBe(fixture3);
    res = r.renderToString(Comp4);
    expect(res).toBe(fixture4);
    res = r.renderToString(Comp5);
    expect(res).toBe(fixture4);
  });
});

describe("pipeToNodeWritable", () => {
  it("renders as expected", done => {
    const chunks = [];
    r.pipeToNodeWritable(Comp2, {
      write(v) {
        chunks.push(v);
      },
      end() {
        expect(chunks.join("")).toBe(fixture2);
        done();
      }
    });
  });
});

describe("pipeToWritable", () => {
  it("renders as expected", done => {
    const chunks = [];
    r.pipeToWritable(Comp2, {
      getWriter() {
        return {
          write(v) {
            chunks.push(v);
            return Promise.resolve();
          },
          releaseLock() {}
        };
      },
      close() {
        expect(chunks.join("")).toBe(fixture2);
        done();
        return Promise.resolve();
      }
    });
  });
});

describe("escape value coercion", () => {
  it("passes numbers, booleans and nullish values through in attribute mode", () => {
    expect(r.escape(42, true)).toBe(42);
    expect(r.escape(0, true)).toBe(0);
    expect(r.escape(true, true)).toBe("true");
    expect(r.escape(false, true)).toBe("false");
    expect(r.escape(null, true)).toBe(null);
    expect(r.escape(undefined, true)).toBe(undefined);
  });

  it("coerces arrays to their final string in attribute mode", () => {
    // Matches the string the client DOM would receive (comma-join), applied
    // before escaping rather than after interpolation.
    expect(r.escape(['a"b', "c&d"], true)).toBe("a&quot;b,c&amp;d");
  });

  it("coerces objects via toString in attribute mode", () => {
    const obj = { toString: () => 'x"y&z' };
    expect(r.escape(obj, true)).toBe("x&quot;y&amp;z");
    expect(r.escape({}, true)).toBe("[object Object]");
  });

  it("renders non-string attribute values consistently with the client DOM", () => {
    const html = r.renderToString(() =>
      r.ssrElement("div", { title: ['a"b', "c"], "data-count": 3 }, undefined, false)
    );
    expect(html).toContain('title="a&quot;b,c"');
    expect(html).toContain('data-count="3"');
  });
});

describe("dynamic attribute and tag names", () => {
  const invalidNames = [
    "",
    "a b",
    'a"b',
    "a'b",
    "a=b",
    "a>b",
    "a<b",
    "a/b",
    "a\tb",
    "a\nb",
    "a\fb",
    "a\rb",
    "a\0b",
    "a\x7Fb",
    "a\x85b"
  ];
  const validProps = {
    "@click": "a",
    "x-on:click": "b",
    ":class": "c",
    "xlink:href": "#d",
    "data-a&b": "e",
    "aria-label": 'f"g',
    "bool:inert": true,
    "attr:foo": 1,
    htmlFor: "x",
    "a.b": "y"
  };
  const validAttrs =
    '@click="a" x-on:click="b" :class="c" xlink:href="#d" data-a&amp;b="e" aria-label="f&quot;g" inert foo="1" for="x" a.b="y"';

  function withNames(make) {
    const props = { id: "a" };
    for (const name of invalidNames) props[make(name)] = "x";
    props.title = "t";
    return props;
  }
  const plainKeys = withNames(n => n);
  const attrKeys = withNames(n => "attr:" + n);
  const boolKeys = withNames(n => "bool:" + n);

  it("ssrElement drops spread keys that are not a single attribute name", () => {
    expect(r.ssrElement("div", plainKeys, undefined, false).t).toBe('<div id="a" title="t"></div>');
  });

  it("ssrElement drops invalid names behind attr: and bool:", () => {
    expect(r.ssrElement("div", attrKeys, undefined, false).t).toBe('<div id="a" title="t"></div>');
    expect(r.ssrElement("div", boolKeys, undefined, false).t).toBe('<div id="a" title="t"></div>');
  });

  it("ssrElement spaces a dropped last key like a skipped one", () => {
    const skipped = r.ssrElement("div", { id: "a", title: undefined }, undefined, false).t;
    expect(r.ssrElement("div", { id: "a", "a b": "x" }, undefined, false).t).toBe(skipped);
    expect(r.ssrElement("div", { id: "a", "bool:a b": true }, undefined, false).t).toBe(skipped);
    expect(r.ssrElement("div", { id: "a", "attr:a b": "x" }, undefined, false).t).toBe(skipped);
  });

  it("ssrElement writes valid names unchanged", () => {
    expect(r.ssrElement("div", validProps, undefined, false).t).toBe(`<div ${validAttrs}></div>`);
  });

  it("ssrElement throws for a tag that is not a single tag name", () => {
    for (const tag of ["div x", "div>", "div/", 'div"', "div\t", "1div", "-div", ":div", ""]) {
      expect(() => r.ssrElement(tag, { id: "a" }, undefined, false)).toThrow(
        `"${tag}" is not a valid tag name`
      );
    }
  });

  it("ssrElement accepts custom element and SVG tag names", () => {
    expect(
      ["my-widget", "x-foo.bar", "math-α", "foreignObject", "svg:rect"].map(
        tag => r.ssrElement(tag, { id: "a" }, undefined, false).t
      )
    ).toEqual([
      '<my-widget id="a"></my-widget>',
      '<x-foo.bar id="a"></x-foo.bar>',
      '<math-α id="a"></math-α>',
      '<foreignObject id="a"></foreignObject>',
      '<svg:rect id="a"></svg:rect>'
    ]);
  });

  it("ssrElement validates names on repeated renders and past the cache bound", () => {
    const many = {};
    for (let i = 0; i < 600; i++) many["data-k" + i] = i;
    const html = r.ssrElement("div", many, undefined, false).t;
    expect(html).toContain('data-k0="0"');
    expect(html).toContain('data-k599="599"');
    for (let i = 0; i < 2; i++) {
      expect(r.ssrElement("div", plainKeys, undefined, false).t).toBe(
        '<div id="a" title="t"></div>'
      );
      expect(r.ssrElement("div", { "a b": "x", "data-late": "y" }, undefined, false).t).toBe(
        '<div data-late="y"></div>'
      );
      expect(() => r.ssrElement("div x", {}, undefined, false)).toThrow();
    }
    for (let i = 0; i < 600; i++) r.ssrElement("x-tag" + i, {}, undefined, false);
    expect(() => r.ssrElement("x-tag 600", {}, undefined, false)).toThrow();
    expect(r.ssrElement("x-tag600", {}, undefined, false).t).toBe("<x-tag600 ></x-tag600>");
  });

  it("ssrSpread drops spread keys that are not a single attribute name", () => {
    expect(r.ssrSpread(plainKeys, false, true)).toBe('id="a" title="t"');
    expect(r.ssrSpread(attrKeys, false, true)).toBe('id="a" title="t"');
    expect(r.ssrSpread(boolKeys, false, true)).toBe('id="a" title="t"');
  });

  it("ssrSpread spaces a dropped last key like a skipped one", () => {
    const skipped = r.ssrSpread({ id: "a", title: undefined }, false, true);
    expect(r.ssrSpread({ id: "a", "a b": "x" }, false, true)).toBe(skipped);
    expect(r.ssrSpread({ id: "a", "bool:a b": true }, false, true)).toBe(skipped);
    expect(r.ssrSpread({ id: "a", "attr:a b": "x" }, false, true)).toBe(skipped);
  });

  it("ssrSpread writes valid names unchanged", () => {
    expect(r.ssrSpread(validProps, false, true)).toBe(validAttrs);
  });

  it("ssrSpread escapes class values like ssrElement", () => {
    const props = { class: 'a"b&c', className: 'd"e', classList: { f: true } };
    expect(r.ssrSpread(props, false, true)).toBe('class="a&quot;b&amp;c d&quot;e f" ');
    expect(r.ssrElement("div", props, undefined, false).t).toBe(
      '<div class="a&quot;b&amp;c d&quot;e f" ></div>'
    );
  });

  it("ssrClassList escapes class names for the class attribute", () => {
    expect(r.ssrClassList({ 'a"b': true, c: true, "d-e": true })).toBe("a&quot;b c d-e");
  });

  it("ssrStyle escapes property names for the style attribute", () => {
    expect(r.ssrStyle({ 'a"b': "1", color: "red", "--x": "2" })).toBe("a&quot;b:1;color:red;--x:2");
  });

  it("ssrStyleProperty escapes names for the style attribute", () => {
    expect(r.ssrStyleProperty('a"b:', "1")).toBe("a&quot;b:1");
    expect(r.ssrStyleProperty(";color:", "red")).toBe(";color:red");
    expect(r.ssrStyleProperty(";color:", undefined)).toBe("");
  });
});

describe("custom serialization plugins", () => {
  class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }

  const PointPlugin = createPlugin({
    tag: 'Point',
    test(value) {
      return value instanceof Point;
    },
    parse: {
      sync(value, ctx) {
        return { x: ctx.parse(value.x), y: ctx.parse(value.y) };
      },
      async async(value, ctx) {
        return { x: ctx.parse(value.x), y: ctx.parse(value.y) };
      },
      stream(value, ctx) {
        return { x: ctx.parse(value.x), y: ctx.parse(value.y) };
      },
    },
    serialize(node, ctx) {
      return `new Point(${ctx.serialize(node.x)},${ctx.serialize(node.y)})`;
    },
    deserialize(node, ctx) {
      return new Point(ctx.deserialize(node.x), ctx.deserialize(node.y));
    },
  });

  it("renderToString accepts plugins option", () => {
    const Comp = () => {
      const pt = new Point(5, 10);
      sharedConfig.context.serialize("pt", pt);
      return r.ssr`<div>test</div>`;
    };

    const html = r.renderToString(Comp, { plugins: [PointPlugin] });
    expect(html).toContain("new Point(5,10)");
    expect(html).toContain("<div>test</div>");
  });

  it("renderToStringAsync accepts plugins option", async () => {
    const Comp = () => {
      const pt = new Point(15, 25);
      sharedConfig.context.serialize("pt", pt);
      return r.ssr`<div>async</div>`;
    };

    const html = await r.renderToStringAsync(Comp, { plugins: [PointPlugin] });
    expect(html).toContain("new Point(15,25)");
    expect(html).toContain("<div>async</div>");
  });

  it("renderToStream accepts plugins option", done => {
    const Comp = () => {
      const pt = new Point(8, 12);
      sharedConfig.context.serialize("pt", pt);
      return r.ssr`<span>stream</span>`;
    };

    const chunks = [];
    const stream = r.renderToStream(Comp, { plugins: [PointPlugin] });
    stream.pipe({
      write(v) {
        chunks.push(v);
      },
      end() {
        const html = chunks.join("");
        expect(html).toContain("new Point(8,12)");
        expect(html).toContain("<span>stream</span>");
        done();
      }
    });
  });
});
