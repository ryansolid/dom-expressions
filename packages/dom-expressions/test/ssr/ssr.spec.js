/**
 * @jest-environment jsdom
 */
import * as r from "../../src/server";
import { createSignal } from "@solidjs/signals";
import { sharedConfig } from "rxcore";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

const fixture = `<div _hk=3 id="main" data-id="12" aria-role="button" class="selected" checked style="color:red" ><h1 custom-attr="1" disabled title="Hello John" style="background-color:red" class="selected"><a href="/">Welcome</a></h1></div>`;
const fixture2 = `<span _hk=0 class="Hello John"> Hello &lt;div/> </span>`;
const fixture3 = `<span> Hello &lt;div/><script nonce=\"1a2s3d4f5g\">window._$HY||(e=>{let t=e=>e&&e.hasAttribute&&(e.hasAttribute(\"_hk\")?e:t(e.host&&e.host.nodeType?e.host:e.parentNode));[\"click\", \"input\"].forEach((o=>document.addEventListener(o,(o=>{if(!e.events)return;let s=t(o.composedPath&&o.composedPath()[0]||o.target);s&&!e.completed.has(s)&&e.events.push([s,o])}))))})(_$HY={events:[],completed:new WeakSet,r:{},fe(){}});</script><!--xs--><link rel=\"modulepreload\" href=\"chunk.js\"></span>`;
const fixture4 = `<span > Hello &lt;div/> </span>`;

const Comp1 = () => {
  const [selected] = createSignal(true),
    something = undefined,
    [welcoming] = createSignal("Hello John"),
    [color] = createSignal("red"),
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

  return r.ssrElement(
    "div",
    {
      id: "main",
      ...results,
      class: { selected: selected() },
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
        },
        class: {
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
    { class: ["Hello", { John: true }] },
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
    r.renderToStream(Comp2).pipe({
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
    r.renderToStream(Comp2).pipeTo({
      getWriter() {
        return {
          write(v) {
            chunks.push(v);
          },
          releaseLock() {}
        };
      },
      close() {
        expect(chunks.join("")).toBe(fixture2);
        done();
      }
    });
  });
});

describe("custom serialization plugins", () => {
  const { createPlugin } = require("seroval");

  class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }

  const PointPlugin = createPlugin({
    tag: "Point",
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
      }
    },
    serialize(node, ctx) {
      return `new Point(${ctx.serialize(node.x)},${ctx.serialize(node.y)})`;
    },
    deserialize(node, ctx) {
      return new Point(ctx.deserialize(node.x), ctx.deserialize(node.y));
    }
  });

  it("renderToString accepts plugins option", () => {
    const Comp = () => {
      sharedConfig.context.serialize("pt", new Point(5, 10));
      return r.ssr`<div>test</div>`;
    };

    const html = r.renderToString(Comp, { plugins: [PointPlugin] });
    expect(html).toContain("new Point(5,10)");
    expect(html).toContain("<div>test</div>");
  });

  it("renderToStringAsync accepts plugins option", async () => {
    const Comp = () => {
      sharedConfig.context.serialize("pt", new Point(15, 25));
      return r.ssr`<div>async</div>`;
    };

    const html = await r.renderToStringAsync(Comp, { plugins: [PointPlugin] });
    expect(html).toContain("new Point(15,25)");
    expect(html).toContain("<div>async</div>");
  });

  it("renderToStream accepts plugins option", done => {
    const Comp = () => {
      sharedConfig.context.serialize("pt", new Point(8, 12));
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
