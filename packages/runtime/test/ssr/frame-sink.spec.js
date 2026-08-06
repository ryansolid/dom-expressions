/**
 * @jest-environment jsdom
 */
// FrameSink seam tests (see src/frame-sink.js). Each extracted seam gets a
// recording-sink test here: `options.sink` overrides one semantic method and
// the test asserts the calls the render core makes, while everything not yet
// extracted keeps writing document output. Full chunk-sequence tests replace
// these once the whole sink surface is routed.
import * as r from "../../src/server";
import { sharedConfig } from "rxcore";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

describe("renderToStream options.sink — data seam", () => {
  it("routes serialized data through sink.data instead of inline scripts", done => {
    const payloads = [];
    const chunks = [];
    const Comp = () => {
      sharedConfig.context.serialize("pt", { x: 8 });
      return r.ssr`<span>sink</span>`;
    };
    r.renderToStream(Comp, { sink: { data: p => payloads.push(p) } }).pipe({
      write(v) {
        chunks.push(v);
      },
      end() {
        const html = chunks.join("");
        expect(html).toContain("<span>sink</span>");
        // With data intercepted and no fragments, no document script remains.
        expect(html).not.toContain("<script");
        expect(payloads.length).toBeGreaterThan(0);
        expect(payloads.join(";")).toContain("pt");
        done();
      }
    });
  });

  it("routes post-shell streamed data through sink.data while fragment output stays document-owned", done => {
    const payloads = [];
    const chunks = [];
    let fragDone;
    const stream = r.renderToStream(
      () => {
        const ctx = sharedConfig.context;
        fragDone = ctx.registerFragment("b1");
        return r.ssr`<div><template id="pl-b1"></template><!--pl-b1--></div>`;
      },
      { sink: { data: p => payloads.push(p) } }
    );
    stream.pipe({
      write(v) {
        chunks.push(v);
        if (chunks.length === 1) setTimeout(() => fragDone("<span>B</span>"));
      },
      end() {
        const html = chunks.join("");
        // Fragment emission is not extracted yet: template payload + $df task
        // still stream as document output.
        expect(html).toContain('<template id="b1"><span>B</span></template>');
        expect(html).toContain('$df("b1")');
        // The fragment's promise record flows through the serializer, so it
        // lands in sink.data, not in the document stream.
        expect(payloads.join(";")).toContain("b1_fr");
        expect(html).not.toContain("b1_fr");
        done();
      }
    });
  });

  it("document behavior is unchanged when no sink is passed", done => {
    const chunks = [];
    const Comp = () => {
      sharedConfig.context.serialize("pt", { x: 8 });
      return r.ssr`<span>doc</span>`;
    };
    r.renderToStream(Comp).pipe({
      write(v) {
        chunks.push(v);
      },
      end() {
        const html = chunks.join("");
        expect(html).toContain("<span>doc</span>");
        expect(html).toContain("<script");
        expect(html).toContain("pt");
        done();
      }
    });
  });
});

describe("renderToStream options.sink — fragment/reveal/asset seam", () => {
  function pipeToString(stream, onFirstChunk) {
    return new Promise(resolve => {
      const chunks = [];
      let seenFirst = false;
      stream.pipe({
        write(v) {
          chunks.push(v);
          if (!seenFirst) {
            seenFirst = true;
            onFirstChunk && onFirstChunk();
          }
        },
        end() {
          resolve(chunks.join(""));
        }
      });
    });
  }

  it("routes an eager fragment through sink.fragment with normalized value and styles", async () => {
    const calls = [];
    let fragDone;
    const html = await pipeToString(
      r.renderToStream(
        () => {
          const ctx = sharedConfig.context;
          fragDone = ctx.registerFragment("b1");
          return r.ssr`<div><template id="pl-b1"></template><!--pl-b1--></div>`;
        },
        { sink: { fragment: (key, value, meta) => calls.push([key, value, meta]) } }
      ),
      () =>
        setTimeout(() => {
          // Register the boundary style post-flush so it is not hoisted into
          // the shell head (pre-flush styles are, and are then excluded from
          // the fragment's streamed styles).
          const ctx = sharedConfig.context;
          ctx._currentBoundaryId = "b1";
          ctx.registerAsset("style", "/b1.css");
          ctx._currentBoundaryId = null;
          fragDone("<span>B</span>");
        })
    );
    expect(calls).toEqual([
      [
        "b1",
        "<span>B</span>",
        { styles: { links: ["/b1.css"], inline: [] }, revealGroup: undefined }
      ]
    ]);
    // Document emission for the fragment was fully intercepted.
    expect(html).not.toContain('<template id="b1">');
    expect(html).not.toContain("$df");
  });

  it("routes grouped reveals through sink.reveal in registration order", async () => {
    const fragments = [];
    const reveals = [];
    let doneA, doneB, reveal;
    await pipeToString(
      r.renderToStream(
        () => {
          const ctx = sharedConfig.context;
          doneA = ctx.registerFragment("fa", { revealGroup: "g" });
          doneB = ctx.registerFragment("fb", { revealGroup: "g" });
          reveal = () => ctx.revealFragments("g");
          return r.ssr`<div><template id="pl-fa"></template><!--pl-fa--><template id="pl-fb"></template><!--pl-fb--></div>`;
        },
        {
          sink: {
            fragment: (key, value, meta) => fragments.push([key, meta.revealGroup]),
            reveal: (keys, meta) => reveals.push([keys, meta])
          }
        }
      ),
      () =>
        setTimeout(() => {
          // Resolve out of registration order; reveal must still be [fa, fb].
          doneB("<span>B</span>");
          doneA("<span>A</span>");
          reveal();
        })
    );
    expect(fragments).toEqual([
      ["fb", "g"],
      ["fa", "g"]
    ]);
    expect(reveals).toEqual([[["fa", "fb"], { fallback: false }]]);
  });

  it("routes fallback reveals through sink.reveal with fallback: true", async () => {
    const reveals = [];
    let doneA, showFallbacks;
    await pipeToString(
      r.renderToStream(
        () => {
          const ctx = sharedConfig.context;
          doneA = ctx.registerFragment("fa", { revealGroup: "g" });
          showFallbacks = () => ctx.revealFallbacks("g");
          return r.ssr`<div><template id="pl-fa"><span>F</span></template><!--pl-fa--></div>`;
        },
        { sink: { reveal: (keys, meta) => reveals.push([keys, meta]) } }
      ),
      () =>
        setTimeout(() => {
          showFallbacks();
          doneA("<span>A</span>");
        })
    );
    expect(reveals[0]).toEqual([["fa"], { fallback: true }]);
  });

  it("routes late module assets through sink.asset", async () => {
    const assets = [];
    let fragDone;
    const html = await pipeToString(
      r.renderToStream(
        () => {
          const ctx = sharedConfig.context;
          fragDone = ctx.registerFragment("b1");
          return r.ssr`<div><template id="pl-b1"></template><!--pl-b1--></div>`;
        },
        { sink: { asset: (type, url) => assets.push([type, url]) } }
      ),
      () =>
        setTimeout(() => {
          sharedConfig.context.registerAsset("module", "/late-chunk.js");
          fragDone("<span>B</span>");
        })
    );
    expect(assets).toEqual([["module", "/late-chunk.js"]]);
    expect(html).not.toContain("/late-chunk.js");
  });

  it("document fragment/reveal output is unchanged when no sink is passed", async () => {
    let fragDone;
    const html = await pipeToString(
      r.renderToStream(() => {
        const ctx = sharedConfig.context;
        fragDone = ctx.registerFragment("b1");
        return r.ssr`<div><template id="pl-b1"></template><!--pl-b1--></div>`;
      }),
      () => setTimeout(() => fragDone("<span>B</span>"))
    );
    expect(html).toContain('<template id="b1"><span>B</span></template>');
    expect(html).toContain('$df("b1")');
  });
});

describe("renderToStream options.sink — shell seam", () => {
  it("routes the resolved shell through sink.shell with preloads and tasks", done => {
    const shells = [];
    const Comp = () => {
      const ctx = sharedConfig.context;
      ctx.serialize("pt", { x: 1 });
      ctx.registerAsset("module", "/entry.js");
      return r.ssr`<head></head><span>shell</span>`;
    };
    r.renderToStream(Comp, {
      sink: { shell: (html, meta) => shells.push([html, meta]) }
    }).pipe({
      write() {},
      end() {
        expect(shells.length).toBe(1);
        const [html, meta] = shells[0];
        // Core hands over the raw shell; splicing is the sink's job.
        expect(html).toContain("<span>shell</span>");
        expect(html).not.toContain("/entry.js");
        expect([...meta.preloads]).toContain("/entry.js");
        // Serialized data accumulated pre-flush rides along as tasks.
        expect(meta.tasks).toContain("pt");
        done();
      }
    });
  });

  it("document shell output is unchanged when no sink is passed", done => {
    const chunks = [];
    const Comp = () => {
      const ctx = sharedConfig.context;
      ctx.registerAsset("module", "/entry.js");
      return r.ssr`<head></head><span>shell</span>`;
    };
    r.renderToStream(Comp).pipe({
      write(v) {
        chunks.push(v);
      },
      end() {
        const html = chunks.join("");
        // Tracked assets are spliced before </head>.
        expect(html).toContain('<link rel="modulepreload" href="/entry.js"></head>');
        expect(html).toContain("<span>shell</span>");
        done();
      }
    });
  });
});
