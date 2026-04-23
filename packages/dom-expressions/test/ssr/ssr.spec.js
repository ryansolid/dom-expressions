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
const fixture3 = `<span> Hello &lt;div/><script nonce=\"1a2s3d4f5g\">window._$HY||(e=>{let t=e=>e&&e.hasAttribute&&(e.hasAttribute(\"_hk\")?e:t(e.host&&e.host.nodeType?e.host:e.parentNode));[\"click\",\"input\"].forEach((o=>document.addEventListener(o,(o=>{if(!e.events)return;let s=t(o.composedPath&&o.composedPath()[0]||o.target);s&&!e.completed.has(s)&&e.events.push([s,o])}))))})(_$HY={events:[],completed:new WeakSet,r:{},fe(){}});</script><!--xs--><link rel=\"modulepreload\" href=\"chunk.js\"></span>`;
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
          color: colorUndefinedFn()
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
  r.useAssets(() => r.ssr`<link rel="modulepreload" href="chunk.js">`);
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
  return r.ssr`<span > ${r.escape(greeting)} ${r.escape(name)} </span>`;
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

    // Callers pass only the keys they intend to materialize now; $dflj reveals
    // every id in the list (idempotent, so repeats are safe).
    runtime.$dflj(["a"]);
    expect(visibleSpans()).toEqual(["FA"]);

    runtime.$df("a");
    runtime.$dflj(["b"]);
    expect(visibleSpans()).toEqual(["A", "FB"]);

    runtime.$df("b");
    runtime.$dflj(["c"]);
    expect(visibleSpans()).toEqual(["A", "B", "FC"]);
    container.remove();
  });

  it("materializes all provided fallbacks in one call", async () => {
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
    expect(visibleSpans()).toEqual(["FA", "FB", "FC"]);
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
    // Already-resolved ids and ids missing from the DOM are skipped; remaining
    // ids are all materialized.
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
    runtime.$dflj(["a"]);
    expect(visibleSpans()).toEqual(["FA"]);

    runtime.$df("a");
    runtime.$dflj(["b"]);
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

describe("cascading root holes in streaming shell", () => {
  function streamToString(stream) {
    return new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
  }

  function asyncError() {
    let resolve;
    const promise = new Promise(r => (resolve = r));
    const err = new Error("async");
    err._promise = promise;
    return { err, resolve };
  }

  it("shell includes content from nested async holes via pipe", async () => {
    const outer = asyncError();
    const inner = asyncError();
    let outerCalls = 0;
    let innerCalls = 0;

    const stream = r.renderToStream(() => {
      return r.ssr`<div>${() => {
        if (++outerCalls === 1) throw outer.err;
        return r.ssr`<span>outer-${() => {
          if (++innerCalls === 1) throw inner.err;
          return "resolved";
        }}-end</span>`;
      }}</div>`;
    });

    setTimeout(() => outer.resolve(), 5);
    setTimeout(() => inner.resolve(), 15);

    const html = await streamToString(stream);
    expect(html).toContain("<span>outer-");
    expect(html).toContain("resolved");
    expect(html).toContain("-end</span>");
  });

  it("shell includes content from nested async holes via pipeTo", async () => {
    const outer = asyncError();
    const inner = asyncError();
    let outerCalls = 0;
    let innerCalls = 0;

    const chunks = [];
    const stream = r.renderToStream(() => {
      return r.ssr`<div>${() => {
        if (++outerCalls === 1) throw outer.err;
        return r.ssr`<span>hello-${() => {
          if (++innerCalls === 1) throw inner.err;
          return "world";
        }}</span>`;
      }}</div>`;
    });

    setTimeout(() => outer.resolve(), 5);
    setTimeout(() => inner.resolve(), 15);

    await stream.pipeTo({
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
        return Promise.resolve();
      }
    });

    const html = chunks.join("");
    expect(html).toContain("<span>hello-");
    expect(html).toContain("world");
  });

  it("mixed resolved and pending root holes all appear in shell", async () => {
    const delayed = asyncError();
    let delayCalls = 0;

    const stream = r.renderToStream(() => {
      return r.ssr`<div>${"sync-content"}-${() => {
        if (++delayCalls === 1) throw delayed.err;
        return "async-content";
      }}</div>`;
    });

    setTimeout(() => delayed.resolve(), 5);

    const html = await streamToString(stream);
    expect(html).toContain("sync-content");
    expect(html).toContain("async-content");
  });

  it("three-level deep cascading holes all resolve in shell", async () => {
    const level1 = asyncError();
    const level2 = asyncError();
    const level3 = asyncError();
    let l1 = 0,
      l2 = 0,
      l3 = 0;

    const stream = r.renderToStream(() => {
      return r.ssr`<div>${() => {
        if (++l1 === 1) throw level1.err;
        return r.ssr`<a>${() => {
          if (++l2 === 1) throw level2.err;
          return r.ssr`<b>${() => {
            if (++l3 === 1) throw level3.err;
            return "deep";
          }}</b>`;
        }}</a>`;
      }}</div>`;
    });

    setTimeout(() => level1.resolve(), 5);
    setTimeout(() => level2.resolve(), 15);
    setTimeout(() => level3.resolve(), 25);

    const html = await streamToString(stream);
    expect(html).toContain("<a>");
    expect(html).toContain("<b>");
    expect(html).toContain("deep");
  });

  it("multiple sibling holes with different cascade depths", async () => {
    const a1 = asyncError();
    const b1 = asyncError();
    const b2 = asyncError();
    let aCalls = 0,
      bCalls = 0,
      b2Calls = 0;

    const stream = r.renderToStream(() => {
      return r.ssr`<div>${() => {
        if (++aCalls === 1) throw a1.err;
        return "shallow";
      }}-${() => {
        if (++bCalls === 1) throw b1.err;
        return r.ssr`<span>${() => {
          if (++b2Calls === 1) throw b2.err;
          return "nested";
        }}</span>`;
      }}</div>`;
    });

    setTimeout(() => {
      a1.resolve();
      b1.resolve();
    }, 5);
    setTimeout(() => b2.resolve(), 15);

    const html = await streamToString(stream);
    expect(html).toContain("shallow");
    expect(html).toContain("<span>");
    expect(html).toContain("nested");
  });

  it("sync-only content passes through without delay", async () => {
    const stream = r.renderToStream(() => {
      return r.ssr`<div>${"hello"}-${"world"}</div>`;
    });

    const html = await streamToString(stream);
    expect(html).toContain("<div>hello-world</div>");
  });
});

describe("root-level module asset serialization", () => {
  function streamToString(stream) {
    return new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
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
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
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
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
      setTimeout(() => done("<span>loaded</span>"));
    });
    expect(html).toContain("b1_assets");
    expect(html).toContain("./Scoped.tsx");
  });

  // Regression: when a boundary fragment resolves while root holes are still
  // cascading (shell not yet committed), the fragment's post-resolve flushEnd
  // must not flush the serializer before the final root `_assets` write runs.
  // Otherwise seroval's Serializer.write silently drops the root asset map
  // once flushed=true. Seen in the /stream page: an inner Loading boundary
  // completes its first chunk while an outer async tree is still resolving,
  // leaving lazy module mappings out of the hydration registry on the client.
  it("root modules serialize when a fragment resolves before shell completes", async () => {
    let outerResolve;
    const outerPromise = new Promise(r => (outerResolve = r));
    const outerErr = new Error("outer");
    outerErr._promise = outerPromise;
    let outerCalls = 0;
    let fragmentDone;

    const html = await new Promise(resolve => {
      const chunks = [];
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        ctx.registerModule("./Lazy.tsx", "/assets/Lazy-abc.js");
        fragmentDone = ctx.registerFragment("b1");
        return r.ssr`<div><template id="pl-b1"></template><!--pl-b1-->${() => {
          if (++outerCalls === 1) throw outerErr;
          return "done";
        }}</div>`;
      }).pipe({
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
      setTimeout(() => {
        fragmentDone("<span>loaded</span>");
      }, 5);
      setTimeout(() => outerResolve(), 30);
    });

    expect(html).toContain("<span>loaded</span>");
    expect(html).toContain("done");
    expect(html).toContain("_assets");
    expect(html).toContain("./Lazy.tsx");
    expect(html).toContain("/assets/Lazy-abc.js");
  });
});

// Manifest support threads through `renderToString`. When an entry is
// marked with `isEntry: true`, its CSS should register as a preload link;
// `context.resolveAssets` should walk the `imports` chain and collect the
// full js+css closure.
describe("manifest-driven asset resolution", () => {
  it("emits preload links for CSS of manifest entries when </head> is present", () => {
    const manifest = {
      _base: "/out/",
      "app.tsx": {
        file: "app-abc.js",
        css: ["app.css"],
        imports: ["shared.tsx"],
        isEntry: true
      },
      "shared.tsx": {
        file: "shared-def.js",
        css: ["shared.css"]
      }
    };

    // injectPreloadLinks looks for `</head>` as its insertion point, so the
    // document must include a head to observe the effect.
    const html = r.renderToString(
      () => r.ssr`<html><head></head><body><div>x</div></body></html>`,
      { manifest }
    );
    expect(html).toContain("/out/app.css");
    expect(html).toContain("/out/shared.css");
  });

  it("context.resolveAssets walks the import graph and prefixes _base", () => {
    const manifest = {
      _base: "/assets/",
      "app.tsx": {
        file: "app-abc.js",
        css: ["app.css"],
        imports: ["shared.tsx"]
      },
      "shared.tsx": {
        file: "shared-def.js",
        css: ["shared.css"]
      }
    };

    let resolved;
    r.renderToString(
      () => {
        resolved = sharedConfig.context.resolveAssets("app.tsx");
        return r.ssr`<div>x</div>`;
      },
      { manifest }
    );

    expect(resolved).toEqual({
      js: ["/assets/app-abc.js", "/assets/shared-def.js"],
      css: ["/assets/app.css", "/assets/shared.css"]
    });
  });

  it("context.resolveAssets returns null for unknown module urls", () => {
    const manifest = { _base: "/", "a.tsx": { file: "a.js" } };
    let resolved;
    r.renderToString(
      () => {
        resolved = sharedConfig.context.resolveAssets("unknown.tsx");
        return r.ssr`<div>x</div>`;
      },
      { manifest }
    );
    expect(resolved).toBeNull();
  });

  it("tolerates manifest entries with no imports or css", () => {
    const manifest = {
      "bare.tsx": { file: "bare.js", isEntry: true }
    };
    // Should render without throwing even though entry has no css/imports.
    const html = r.renderToString(() => r.ssr`<div>x</div>`, { manifest });
    expect(html).toContain("<div>x</div>");
  });
});

// context.getBoundaryModules is exposed on the SSR context so callers can
// read back what registerModule has staged for a given boundary id.
// context._currentBoundaryId is the paired accessor — its getter has to
// reflect the live `currentBoundaryId` on the tracking object.
describe("boundary module/id accessors", () => {
  it("roundtrips registerModule via getBoundaryModules under the root sentinel", () => {
    let modules;
    let initialBoundary;
    r.renderToString(() => {
      const ctx = sharedConfig.context;
      initialBoundary = ctx._currentBoundaryId;
      ctx.registerModule("./Lazy.tsx", "/assets/Lazy-abc.js");
      ctx.registerModule("./Other.tsx", "/assets/Other-def.js");
      modules = ctx.getBoundaryModules("");
      return r.ssr`<div>x</div>`;
    });

    expect(initialBoundary).toBeNull();
    expect(modules).toEqual({
      "./Lazy.tsx": "/assets/Lazy-abc.js",
      "./Other.tsx": "/assets/Other-def.js"
    });
  });

  it("getBoundaryModules returns null for an unregistered boundary id", () => {
    let missing;
    r.renderToString(() => {
      missing = sharedConfig.context.getBoundaryModules("nope");
      return r.ssr`<div>x</div>`;
    });
    expect(missing).toBeNull();
  });

  it("reflects _currentBoundaryId after a setter assignment", () => {
    const observed = [];
    r.renderToString(() => {
      const ctx = sharedConfig.context;
      observed.push(ctx._currentBoundaryId);
      ctx._currentBoundaryId = "frag-1";
      observed.push(ctx._currentBoundaryId);
      ctx._currentBoundaryId = null;
      observed.push(ctx._currentBoundaryId);
      return r.ssr`<div>x</div>`;
    });
    expect(observed).toEqual([null, "frag-1", null]);
  });
});

// Pure-helper branches that aren't exercised by the higher-level render
// tests. Cheap to target and push the overall branch coverage up.
describe("escape helper branches", () => {
  it("escapes both < and & in non-attribute mode", () => {
    // The interleaved loop handles iDelim < iAmp then iAmp < iDelim.
    expect(r.escape("a<b&c<d&e")).toBe("a&lt;b&amp;c&lt;d&amp;e");
  });

  it("continues with trailing < after ampersands are consumed", () => {
    // Exits interleaved loop with iAmp === -1, then only-delim loop runs.
    expect(r.escape("a&b<c<d")).toBe("a&amp;b&lt;c&lt;d");
  });

  it("continues with trailing & after angle brackets are consumed", () => {
    // Exits interleaved loop with iDelim === -1, then only-amp loop runs.
    expect(r.escape("a<b&c&d")).toBe("a&lt;b&amp;c&amp;d");
  });

  it("returns the original string when nothing needs escaping", () => {
    expect(r.escape("plain text")).toBe("plain text");
  });

  it("escapes quotes and ampersands in attribute mode", () => {
    expect(r.escape('a"b&c', true)).toBe("a&quot;b&amp;c");
  });

  it("escapes arrays without double-escaping contents", () => {
    expect(r.escape(["a<b", "c&d"])).toEqual(["a&lt;b", "c&amp;d"]);
  });

  it("passes booleans through in attribute mode", () => {
    expect(r.escape(true, true)).toBe(true);
    expect(r.escape(false, true)).toBe(false);
  });
});

// applyRef is exported on the server build for isomorphic code paths —
// it should behave identically to the client implementation.
describe("server applyRef", () => {
  it("calls a single function ref with the element", () => {
    let received;
    const el = { tag: "svg" };
    r.applyRef(el2 => (received = el2), el);
    expect(received).toBe(el);
  });

  it("flattens nested array refs and calls each function", () => {
    const calls = [];
    const el = { tag: "a" };
    r.applyRef([el2 => calls.push("a"), [el2 => calls.push("b")]], el);
    expect(calls).toEqual(["a", "b"]);
  });
});

// The server entry re-exports every client-only mutation API as a stub
// that throws, so misuse fails loudly instead of silently.
describe("client-only API stubs", () => {
  it("r.render throws when invoked on the server", () => {
    expect(() => r.render(() => "x", {})).toThrow(/Client-only API/);
  });

  it("r.style throws when invoked on the server", () => {
    expect(() => r.style({}, {}, undefined)).toThrow(/Client-only API/);
  });

  it("r.delegateEvents throws when invoked on the server", () => {
    expect(() => r.delegateEvents(["click"])).toThrow(/Client-only API/);
  });
});

// ssrElement has tag-specific children handling: script / style / innerHTML
// children are passed through as-is, while any other child property is
// escaped. Each branch needs its own case to hit the conditional.
describe("ssrElement child-property handling", () => {
  it("passes <script> textContent through unescaped", () => {
    const html = r.renderToString(() => r.ssrElement("script", { textContent: "var a = 1 < 2;" }));
    expect(html).toContain("var a = 1 < 2;");
  });

  it("passes <style> textContent through unescaped", () => {
    const html = r.renderToString(() =>
      r.ssrElement("style", { textContent: ".a>b { color: red; }" })
    );
    expect(html).toContain(".a>b { color: red; }");
  });

  it("passes innerHTML through unescaped for other tags", () => {
    const html = r.renderToString(() => r.ssrElement("div", { innerHTML: "<b>bold</b>" }));
    expect(html).toContain("<b>bold</b>");
  });

  it("escapes non-special child properties like textContent on a <div>", () => {
    const html = r.renderToString(() => r.ssrElement("div", { textContent: "a < b & c" }));
    // The child is escape()'d for non-script/style/innerHTML cases.
    expect(html).toContain("a &lt; b &amp; c");
  });
});

// injectAssets inserts useAssets-registered output above </head>. Without a
// head tag it is a no-op; with one it should splice in the output.
describe("useAssets injection path", () => {
  it("injects useAssets output just before </head>", () => {
    const html = r.renderToString(() => {
      r.useAssets(() => r.ssr`<meta name="rendered" content="1">`);
      return r.ssr`<html><head></head><body><div>x</div></body></html>`;
    });
    expect(html).toContain('<meta name="rendered" content="1"></head>');
  });
});

// resolveSSRSync throws whenever an async hole reaches the synchronous
// resolver — i.e. the sync entry path tried to render an unresolved async
// boundary. Simulate by throwing a hole-bearing error from inside
// renderToString (async renderer would hand it off to the stream).
describe("resolveSSRSync error", () => {
  it("throws a helpful error when a pending async hole reaches sync path", () => {
    expect(() =>
      r.renderToString(
        () =>
          r.ssr`<div>${() => {
            const err = new Error("async-in-sync");
            err._promise = new Promise(() => {}); // never resolves
            throw err;
          }}</div>`
      )
    ).toThrow(/cannot be rendered synchronously/);
  });
});

// renderToStream's context exposes `replace(id, fn)` for synchronous
// placeholder substitution between the shell render and flush. It looks
// for <!--!$id--> / <!--!$/id--> pairs in the in-progress html string.
describe("renderToStream context.replace", () => {
  function pipeToString(stream) {
    return new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
  }

  it("splices payloadFn output between matching marker comments", async () => {
    // context.replace closes over the html variable that isn't initialized
    // until code() returns, so the call has to be deferred via block().
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        const p = new Promise(resolve => {
          setTimeout(() => {
            ctx.replace("slot", () => r.ssr`<b>replaced</b>`);
            resolve();
          }, 0);
        });
        ctx.block(p);
        return r.ssr`<div><!--!$slot--><i>original</i><!--!$/slot--></div>`;
      })
    );
    expect(html).toContain("<b>replaced</b>");
    expect(html).not.toContain("<i>original</i>");
  });

  it("is a no-op when the start marker cannot be found", async () => {
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        const p = new Promise(resolve => {
          setTimeout(() => {
            ctx.replace("unknown", () => r.ssr`<b>never</b>`);
            resolve();
          }, 0);
        });
        ctx.block(p);
        return r.ssr`<div>no markers</div>`;
      })
    );
    expect(html).toContain("<div>no markers</div>");
    expect(html).not.toContain("<b>never</b>");
  });
});

// context.serialize with `deferStream=true` puts the promise into the
// blocking queue and pipes its resolved/rejected value through the
// serializer on the next tick.
describe("renderToStream context.serialize deferStream", () => {
  function pipeToString(stream) {
    return new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
  }

  it("defers promise-typed serialize entries into the blocking set", async () => {
    // Self-resolving promise so the stream doesn't hang waiting for it.
    const data = new Promise(resolve => setTimeout(() => resolve("payload"), 5));
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        ctx.serialize("deferred-id", data, true);
        return r.ssr`<div>shell</div>`;
      })
    );
    expect(html).toContain("<div>shell</div>");
  });
});

// registerFragment must throw when a fragment key joins a reveal group
// that has already been released — otherwise ordering invariants break.
describe("registerFragment reveal-group guard", () => {
  function pipeToString(stream) {
    return new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
  }

  it("throws if registration happens after revealFragments released the group", async () => {
    let caught;
    await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        // Release first, then try to join — the guard should fire.
        ctx.revealFragments("g-late");
        try {
          ctx.registerFragment("frag-x", { revealGroup: "g-late" });
        } catch (err) {
          caught = err;
        }
        return r.ssr`<div>shell</div>`;
      })
    );
    expect(caught).toBeInstanceOf(Error);
    expect(caught.message).toMatch(/called after revealFragments/);
  });
});

// Nested fragments: a child fragment resolves while its parent is still
// pending. The child's resolve path should attach it to the parent via
// `parent.children` and propagate boundary styles instead of flushing.
describe("nested fragment resolution", () => {
  function pipeToString(stream) {
    return new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
  }

  it("stores child payload on the parent and propagates boundary styles", async () => {
    let resolveParent, resolveChild;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        // Parent registered first so the child key (which starts with the
        // parent key) can look it up as its parent via waitForFragments.
        resolveParent = ctx.registerFragment("pa");
        resolveChild = ctx.registerFragment("pa-child");
        // Register a style asset for the child boundary so propagation has
        // something to forward to the parent.
        ctx._currentBoundaryId = "pa-child";
        ctx.registerAsset("style", "/child-only.css");
        ctx._currentBoundaryId = null;
        setTimeout(() => {
          // Resolve child first → child gets pinned on parent.children.
          resolveChild("<span>child</span>");
          // Then parent resolves, iterating children and replacing the
          // placeholder-template range with the child payload.
          resolveParent('<i>parent<template id="pl-pa-child"></template><!--pl-pa-child--></i>');
        });
        return r.ssr`<div><template id="pl-pa"></template><!--pl-pa--></div>`;
      })
    );
    expect(html).toContain("parent");
    expect(html).toContain("<span>child</span>");
  });
});

// The shell finisher doubles up onCompleteAll callbacks when `.then(fn)`
// is called as well. The extra wrapper must invoke both the original
// user-supplied option and the then-callback.
describe("renderToStream .then + onCompleteAll interplay", () => {
  it("runs both the onCompleteAll option and the .then handler", async () => {
    const calls = [];
    const stream = r.renderToStream(() => r.ssr`<div>z</div>`, {
      onCompleteAll: () => calls.push("option")
    });
    await new Promise(resolve => {
      stream.then(() => {
        calls.push("then");
        resolve();
      });
    });
    expect(calls).toEqual(["option", "then"]);
  });
});

// renderToString also has a per-boundary style tracker, reachable by
// setting _currentBoundaryId before calling registerAsset. The "url
// already registered" path is hit by re-registering the same url.
describe("renderToString registerAsset boundary-style path", () => {
  it("tracks boundary styles and deduplicates repeated urls", () => {
    let capturedStylesForB1;
    const html = r.renderToString(() => {
      const ctx = sharedConfig.context;
      ctx._currentBoundaryId = "b1";
      ctx.registerAsset("style", "/x.css");
      ctx.registerAsset("style", "/x.css"); // duplicate → Set dedups
      ctx.registerAsset("style", "/y.css");
      ctx._currentBoundaryId = null;
      // Non-boundary style still goes to emittedAssets.
      ctx.registerAsset("style", "/outside.css");
      return r.ssr`<html><head></head><body><div>x</div></body></html>`;
    });
    // All three unique urls appear as preload links in <head>.
    expect(html).toContain("/x.css");
    expect(html).toContain("/y.css");
    expect(html).toContain("/outside.css");
  });
});

// The stream's registerAsset emits a <link rel=modulepreload> inline when
// a module is registered *after* the shell has already flushed.
describe("renderToStream late registerAsset(module)", () => {
  function pipeToString(stream) {
    return new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
  }

  it("emits a modulepreload link when a module registers after shell flush", async () => {
    let done;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        done = ctx.registerFragment("late-mod");
        setTimeout(() => {
          ctx.registerAsset("module", "/late-chunk.js");
          done("<span>done</span>");
        }, 10);
        return r.ssr`<div><template id="pl-late-mod"></template><!--pl-late-mod--></div>`;
      })
    );
    expect(html).toContain('rel="modulepreload"');
    expect(html).toContain("/late-chunk.js");
  });
});

// Fragments that carry boundary styles and resolve *after* the shell has
// flushed run the styled-fragment branch: emit $dfs task + stylesheet
// <link> tags + template payload.
describe("renderToStream styled fragment after shell flush", () => {
  function pipeToString(stream) {
    return new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
  }

  it("emits $dfs + <link> tags when a fragment boundary has styles", async () => {
    let done;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        done = ctx.registerFragment("sf");
        setTimeout(() => {
          // Register the style *after* the shell has flushed so it is not
          // in `headStyles` and collectStreamStyles yields a non-empty list.
          ctx._currentBoundaryId = "sf";
          ctx.registerAsset("style", "/fragment.css");
          ctx._currentBoundaryId = null;
          done("<span>loaded</span>");
        }, 10);
        return r.ssr`<div><template id="pl-sf"></template><!--pl-sf--></div>`;
      })
    );
    expect(html).toContain('$dfs("sf"');
    expect(html).toContain("/fragment.css");
  });
});

// onCompleteShell / onCompleteAll writers accept user-supplied chunks
// and splice them into the buffer as long as the stream hasn't ended.
describe("renderToStream onComplete writer callbacks", () => {
  function pipeToString(stream) {
    return new Promise(resolve => {
      const chunks = [];
      stream.pipe({
        write(v) {
          chunks.push(v);
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
  }

  it("onCompleteShell writer.write adds content to the flushed shell", async () => {
    const html = await pipeToString(
      r.renderToStream(() => r.ssr`<div>shell</div>`, {
        onCompleteShell(writer) {
          writer.write("<extra-shell>");
        }
      })
    );
    expect(html).toContain("<div>shell</div>");
    expect(html).toContain("<extra-shell>");
  });

  it("onCompleteAll writer.write appends content before the stream ends", async () => {
    const html = await pipeToString(
      r.renderToStream(() => r.ssr`<div>body</div>`, {
        onCompleteAll(writer) {
          writer.write("<extra-final>");
        }
      })
    );
    expect(html).toContain("<extra-final>");
  });
});

// injectPreloadLinks handles both .css and non-.css urls — the non-css
// branch outputs a <link rel=modulepreload> tag.
describe("modulepreload link for non-CSS assets", () => {
  it("emits rel=modulepreload for registered .js assets", () => {
    const html = r.renderToString(() => {
      sharedConfig.context.registerAsset("module", "/chunk.js");
      return r.ssr`<html><head></head><body><div>x</div></body></html>`;
    });
    expect(html).toContain('rel="modulepreload"');
    expect(html).toContain("/chunk.js");
  });
});

// injectScripts has two branches: splice before <!--xs--> (left by
// HydrationScript) or append at the end when that marker is absent.
describe("injectScripts placement", () => {
  it("appends the serialization script when <!--xs--> is absent", () => {
    const html = r.renderToString(() => {
      // serialize makes the serializer produce a hydration bootstrap script.
      sharedConfig.context.serialize("sc-id", { hello: "world" });
      return r.ssr`<div>no-hs</div>`;
    });
    // No <!--xs--> since HydrationScript wasn't used; script is appended.
    expect(html).toContain("<div>no-hs</div>");
    expect(html).toContain("<script>");
    const scriptIdx = html.indexOf("<script>");
    const divIdx = html.indexOf("<div>no-hs</div>");
    expect(scriptIdx).toBeGreaterThan(divIdx);
  });

  it("splices the serialization script at <!--xs--> when HydrationScript was used", () => {
    const html = r.renderToString(() => {
      sharedConfig.context.serialize("sc-id", { hello: "world" });
      return r.ssr`<html><head>${r.HydrationScript()}</head><body><div>x</div></body></html>`;
    });
    // HydrationScript produces <!--xs--> which is the insertion anchor.
    expect(html).toContain("<!--xs-->");
    // Serialization output reference ("sc-id" shows up in the scope map).
    expect(html).toContain("sc-id");
  });
});

// getRequestEvent surfaces the current request's async-local store when
// RequestContext has been attached on globalThis (Cloudflare-style host).
describe("getRequestEvent", () => {
  it("returns the store from globalThis[RequestContext]", () => {
    const event = { method: "GET", url: "/" };
    globalThis[r.RequestContext] = { getStore: () => event };
    try {
      expect(r.getRequestEvent()).toBe(event);
    } finally {
      delete globalThis[r.RequestContext];
    }
  });

  it("falls back to undefined when RequestContext is absent", () => {
    expect(r.getRequestEvent()).toBeUndefined();
  });
});

// renderToString cannot serialize async values — it is synchronous. The
// guard in context.serialize must fire for Promise / async-iterator values.
describe("renderToString async-serialize guard", () => {
  it("throws a helpful error when given a Promise", () => {
    expect(() =>
      r.renderToString(() => {
        sharedConfig.context.serialize("promise-id", Promise.resolve(42));
        return r.ssr`<div>x</div>`;
      })
    ).toThrow(/Cannot serialize async value.*renderToString.*promise-id/);
  });

  it("throws for async iterators too", () => {
    const asyncIterable = {
      [Symbol.asyncIterator]() {
        return { next: () => Promise.resolve({ done: true }) };
      }
    };
    expect(() =>
      r.renderToString(() => {
        sharedConfig.context.serialize("iter-id", asyncIterable);
        return r.ssr`<div>x</div>`;
      })
    ).toThrow(/Cannot serialize async value.*iter-id/);
  });
});

// Runtime contract for the pure-string SSR helpers. Security claims live
// with the JSX round-trip tests in `jsx.spec.jsx` (they demonstrate the
// hostile input actually reachable from compiler output). These tests only
// cover helper-shape behavior: null / empty / undefined skipping.
describe("SSR helper contracts", () => {
  it("ssrStyle returns empty string for null / empty input", () => {
    expect(r.ssrStyle(null)).toBe("");
    expect(r.ssrStyle("")).toBe("");
    expect(r.ssrStyle({})).toBe("");
  });

  it("ssrStyle skips entries whose value is undefined", () => {
    expect(r.ssrStyle({ a: "1", b: undefined, c: "3" })).toBe("a:1;c:3");
  });

  it("ssrStyleProperty returns empty string when value is null / undefined", () => {
    expect(r.ssrStyleProperty("color:", null)).toBe("");
    expect(r.ssrStyleProperty("color:", undefined)).toBe("");
  });

  it("ssrAttribute emits empty string for null / false", () => {
    expect(r.ssrAttribute("disabled", null)).toBe("");
    expect(r.ssrAttribute("disabled", false)).toBe("");
  });

  it("ssrAttribute emits bare attribute for `true`", () => {
    expect(r.ssrAttribute("disabled", true)).toBe(" disabled");
  });

  it("ssrAttribute does not double-escape values (trusts compiler-escaped input)", () => {
    expect(r.ssrAttribute("title", "pre&amp;escaped")).toBe(' title="pre&amp;escaped"');
  });
});
