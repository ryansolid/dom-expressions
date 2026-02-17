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
