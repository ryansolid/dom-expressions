/**
 * @jest-environment jsdom
 */
import * as r from "../../src/server";
import { createSignal } from "@solidjs/signals";
import { sharedConfig } from "rxcore";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

const fixture = `<div _hk=0 id="main" data-id="12" aria-role="button" class="selected" checked style="color:red" ><h1 custom-attr="1" disabled title="Hello John" style="background-color:red" class="selected"><a href="/">Welcome</a></h1></div>`;
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

describe("reveal defensive invariants", () => {
  function streamToString(stream, onFirstChunk) {
    return new Promise(resolve => {
      const chunks = [];
      let seenFirstChunk = false;
      stream.pipe({
        write(v) {
          chunks.push(v);
          if (!seenFirstChunk) {
            seenFirstChunk = true;
            onFirstChunk && onFirstChunk();
          }
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
  }

  function extractRuntimeScript(html) {
    const fnStart = html.indexOf("function $df(");
    const scriptTagStart = html.lastIndexOf("<script", fnStart);
    const scriptContentStart = html.indexOf(">", scriptTagStart) + 1;
    const scriptEnd = html.indexOf("</script>", fnStart);
    const content = html.slice(scriptContentStart, scriptEnd);
    const start = content.indexOf("function $df(");
    const tail = content.indexOf("function $dfj(", start);
    let depth = 0;
    let end = tail;
    for (; end < content.length; end++) {
      const ch = content[end];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end++;
          break;
        }
      }
    }
    return content.slice(start, end);
  }

  async function loadRuntimeFns() {
    let done;
    let reveal;
    const html = await streamToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        done = ctx.registerFragment("rt", { revealGroup: "rt-g" });
        reveal = () => ctx.revealFragments("rt-g");
        return r.ssr`<div><template id="pl-rt"></template><!--pl-rt--></div>`;
      }),
      () => {
        setTimeout(() => {
          done("<span>RT</span>");
          reveal();
        });
      }
    );
    const runtime = extractRuntimeScript(html);
    return (0, eval)(`(()=>{${runtime};return{$df,$dfl,$dflj,$dfs,$dfc,$dfg,$dfj}})()`);
  }

  let runtime;
  beforeAll(async () => {
    runtime = await loadRuntimeFns();
  });

  it("style completion path ($dfc) gates grouped reveal", async () => {
    globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, done: false, fe() {} };
    const container = document.createElement("div");
    container.innerHTML =
      '<div><template id="pl-a"></template><!--pl-a--><template id="a"><span>A</span></template><template id="pl-b"></template><!--pl-b--><template id="b"><span>B</span></template></div>';
    document.body.appendChild(container);

    runtime.$dfs("b", 1, 1);
    runtime.$dfj(["a", "b"]);
    expect(container.innerHTML).toContain('<template id="pl-a"></template><!--pl-a-->');
    runtime.$dfc("b");
    expect(container.innerHTML).toBe("<div><span>A</span><span>B</span></div>");
    container.remove();
  });

  it("emits fallback frontier materialization task when requested", async () => {
    let doneA;
    let doneB;
    let doneC;
    let showNextFallback;
    const html = await streamToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        doneA = ctx.registerFragment("fa", { revealGroup: "fg" });
        doneB = ctx.registerFragment("fb", { revealGroup: "fg" });
        doneC = ctx.registerFragment("fc", { revealGroup: "fg" });
        showNextFallback = () => ctx.revealFallbacks("fg");
        return r.ssr`<div><template id="pl-fa"><span>FA</span></template><!--pl-fa--><template id="pl-fb"><span>FB</span></template><!--pl-fb--><template id="pl-fc"><span>FC</span></template><!--pl-fc--></div>`;
      }),
      () => {
        setTimeout(() => {
          showNextFallback();
          doneA("<span>A</span>");
          doneB("<span>B</span>");
          doneC("<span>C</span>");
        });
      }
    );
    expect(html).toContain('$dflj(["fa","fb","fc"])');
  });

  it("advances collapsed fallback frontier independently from final reveal", async () => {
    globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, done: false, fe() {} };
    const container = document.createElement("div");
    container.innerHTML =
      '<div><template id="pl-a"><span>FA</span></template><!--pl-a--><template id="a"><span>A</span></template><template id="pl-b"><span>FB</span></template><!--pl-b--><template id="b"><span>B</span></template><template id="pl-c"><span>FC</span></template><!--pl-c--><template id="c"><span>C</span></template></div>';
    document.body.appendChild(container);
    const host = container.firstChild;
    const visibleSpans = () =>
      [...host.childNodes]
        .filter(n => n.nodeType === 1 && n.localName === "span")
        .map(n => n.textContent);

    runtime.$dflj(["a", "b", "c"]);
    expect(visibleSpans()).toEqual(["FA"]);

    runtime.$df("a");
    runtime.$dflj(["a", "b", "c"]);
    expect(visibleSpans()).toEqual(["A", "FB"]);

    runtime.$df("b");
    runtime.$dflj(["a", "b", "c"]);
    expect(visibleSpans()).toEqual(["A", "B", "FC"]);
    container.remove();
  });

  it("does not duplicate fallback when the same frontier is materialized repeatedly", async () => {
    globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, done: false, fe() {} };
    const container = document.createElement("div");
    container.innerHTML =
      '<div><template id="pl-r"><span>FR</span></template><!--pl-r--><template id="r"><span>R</span></template></div>';
    document.body.appendChild(container);
    const host = container.firstChild;
    const visibleSpans = () =>
      [...host.childNodes]
        .filter(n => n.nodeType === 1 && n.localName === "span")
        .map(n => n.textContent);

    runtime.$dflj(["r"]);
    runtime.$dflj(["r"]);
    runtime.$dflj(["r"]);
    expect(visibleSpans()).toEqual(["FR"]);
    container.remove();
  });

  it("skips missing/resolved entries and materializes the next available fallback", async () => {
    globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, done: false, fe() {} };
    const container = document.createElement("div");
    container.innerHTML =
      '<div><template id="pl-a"><span>FA</span></template><!--pl-a--><template id="a"><span>A</span></template><template id="pl-b"><span>FB</span></template><!--pl-b--><template id="b"><span>B</span></template></div>';
    document.body.appendChild(container);
    const host = container.firstChild;
    const visibleSpans = () =>
      [...host.childNodes]
        .filter(n => n.nodeType === 1 && n.localName === "span")
        .map(n => n.textContent);

    runtime.$df("a");
    runtime.$dflj(["missing", "a", "b"]);
    expect(visibleSpans()).toEqual(["A", "FB"]);
    container.remove();
  });

  it("keeps interleaved groups isolated when one group is style blocked", async () => {
    globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, done: false, fe() {} };
    const container = document.createElement("div");
    container.innerHTML =
      '<div><template id="pl-g1a"></template><!--pl-g1a--><template id="g1a"><span>1A</span></template><template id="pl-g1b"></template><!--pl-g1b--><template id="g1b"><span>1B</span></template><template id="pl-g2a"></template><!--pl-g2a--><template id="g2a"><span>2A</span></template><template id="pl-g2b"></template><!--pl-g2b--><template id="g2b"><span>2B</span></template></div>';
    document.body.appendChild(container);

    runtime.$dfs("g1b", 1, 1);
    runtime.$dfj(["g1a", "g1b"]);
    runtime.$dfj(["g2a", "g2b"]);

    expect(container.innerHTML).toContain('<template id="pl-g1a"></template><!--pl-g1a-->');
    expect(container.innerHTML).toContain("<span>2A</span><span>2B</span>");
    runtime.$dfc("g1b");
    expect(container.innerHTML).toContain("<span>1A</span><span>1B</span>");
    container.remove();
  });

  it("keeps collapsed fallback frontier advancing while grouped reveal is style-gated", async () => {
    globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, done: false, fe() {} };
    const container = document.createElement("div");
    container.innerHTML =
      '<div><template id="pl-a"><span>FA</span></template><!--pl-a--><template id="a"><span>A</span></template><template id="pl-b"><span>FB</span></template><!--pl-b--><template id="b"><span>B</span></template><template id="pl-c"><span>FC</span></template><!--pl-c--><template id="c"><span>C</span></template></div>';
    document.body.appendChild(container);
    const host = container.firstChild;
    const visibleSpans = () =>
      [...host.childNodes]
        .filter(n => n.nodeType === 1 && n.localName === "span")
        .map(n => n.textContent);

    runtime.$dfs("b", 1, 1);
    runtime.$dflj(["a", "b", "c"]);
    expect(visibleSpans()).toEqual(["FA"]);

    runtime.$df("a");
    runtime.$dflj(["a", "b", "c"]);
    expect(visibleSpans()).toEqual(["A", "FB"]);

    runtime.$dfj(["a", "b", "c"]);
    expect(visibleSpans()).toEqual(["A", "FB"]);

    runtime.$dfc("b");
    expect(visibleSpans()).toEqual(["A", "B", "C"]);
    container.remove();
  });

  it("tolerates repeated $dfc calls after reveal", async () => {
    globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, done: false, fe() {} };
    const container = document.createElement("div");
    container.innerHTML =
      '<div><template id="pl-x"></template><!--pl-x--><template id="x"><span>X</span></template></div>';
    document.body.appendChild(container);

    runtime.$dfs("x", 1, 0);
    runtime.$dfc("x");
    expect(container.innerHTML).toBe("<div><span>X</span></div>");
    expect(() => runtime.$dfc("x")).not.toThrow();
    container.remove();
  });

  it("cleans style/group tracking entries after grouped reveal", async () => {
    globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, done: false, fe() {} };
    const container = document.createElement("div");
    container.innerHTML =
      '<div><template id="pl-c1"></template><!--pl-c1--><template id="c1"><span>C1</span></template><template id="pl-c2"></template><!--pl-c2--><template id="c2"><span>C2</span></template></div>';
    document.body.appendChild(container);

    runtime.$dfs("c2", 1, 1);
    runtime.$dfj(["c1", "c2"]);
    runtime.$dfc("c2");

    expect(globalThis._$HY.sc?.c2).toBeUndefined();
    expect(globalThis._$HY.sd?.c2).toBeUndefined();
    expect(globalThis._$HY.sg?.c1).toBeUndefined();
    expect(globalThis._$HY.sg?.c2).toBeUndefined();
    container.remove();
  });

  it("handles empty reveal batch as no-op", async () => {
    globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, done: false, fe() {} };
    expect(() => runtime.$dfj([])).not.toThrow();
  });

  it("keeps unknown-group early release harmless for unrelated groups", async () => {
    let done;
    let reveal;
    const html = await streamToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        ctx.revealFragments("ghost-group");
        done = ctx.registerFragment("known-a", { revealGroup: "known-g" });
        reveal = () => ctx.revealFragments("known-g");
        return r.ssr`<div><template id="pl-known-a"></template><!--pl-known-a--></div>`;
      }),
      () => {
        setTimeout(() => {
          done("<span>K</span>");
          reveal();
        });
      }
    );
    expect(html).toContain('<template id="known-a"><span>K</span></template>');
    expect(html).toContain('$dfj(["known-a"])');
  });
});

describe("root-level module asset serialization", () => {
  function streamToString(stream) {
    return new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) { chunks.push(v); },
        end() { resolve(chunks.join("")); }
      });
    });
  }

  it("registerModule without a boundary stores modules under root sentinel", () => {
    const html = r.renderToString(() => {
      const ctx = sharedConfig.context;
      ctx.registerModule("./Lazy.tsx", "/assets/Lazy-abc.js");
      return r.ssr`<div>content</div>`;
    });
    expect(html).toContain("_assets");
    expect(html).toContain("./Lazy.tsx");
    expect(html).toContain("/assets/Lazy-abc.js");
  });

  it("renderToStream serializes root-level modules in hydration data", async () => {
    const html = await new Promise(resolve => {
      const chunks = [];
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        ctx.registerModule("./Lazy.tsx", "/assets/Lazy-abc.js");
        ctx.registerModule("./Other.tsx", "/assets/Other-def.js");
        return r.ssr`<div>content</div>`;
      }).pipe({
        write(v) { chunks.push(v); },
        end() { resolve(chunks.join("")); }
      });
    });
    expect(html).toContain("_assets");
    expect(html).toContain("./Lazy.tsx");
    expect(html).toContain("/assets/Lazy-abc.js");
    expect(html).toContain("./Other.tsx");
    expect(html).toContain("/assets/Other-def.js");
  });

  it("boundary-scoped modules still serialize under their boundary key", async () => {
    const html = await new Promise(resolve => {
      const chunks = [];
      let done;
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        done = ctx.registerFragment("b1");
        ctx._currentBoundaryId = "b1";
        ctx.registerModule("./Scoped.tsx", "/assets/Scoped-123.js");
        ctx._currentBoundaryId = null;
        return r.ssr`<div><template id="pl-b1"></template><!--pl-b1--></div>`;
      }).pipe({
        write(v) { chunks.push(v); },
        end() { resolve(chunks.join("")); }
      });
      setTimeout(() => done("<span>loaded</span>"));
    });
    expect(html).toContain("b1_assets");
    expect(html).toContain("./Scoped.tsx");
  });
});
