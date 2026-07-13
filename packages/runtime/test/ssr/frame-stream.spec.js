/**
 * @jest-environment jsdom
 */
// Level-3 chunk-sequence tests: renderToFrameStream drives the shared render
// core through createFrameSink and must emit the canonical FrameChunk
// sequences (RFC "Example Chunk Shapes"). Chunks are plain objects — the
// envelope is transport-agnostic.
import * as r from "../../src/server";
import { renderToFrameStream } from "../../src/frame-sink";
import { sharedConfig } from "rxcore";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

function collect(stream, onChunk) {
  return new Promise(resolve => {
    const chunks = [];
    stream.pipe({
      write(c) {
        chunks.push(c);
        onChunk && onChunk(c);
      },
      end: () => resolve(chunks)
    });
  });
}

const typeIndex = (chunks, type) => chunks.findIndex(c => c.type === type);

describe("renderToFrameStream chunk sequences", () => {
  it("emits start / html / complete for a synchronous frame (RFC case 1)", async () => {
    const chunks = await renderToFrameStream(() => r.ssr`<div>Hello</div>`, {
      frame: { id: "f0", version: 1 }
    });
    expect(chunks).toEqual([
      { type: "start", id: "f0", version: 1 },
      { type: "html", id: "f0", version: 1, html: "<div>Hello</div>" },
      { type: "complete", id: "f0", version: 1 }
    ]);
  });

  it("delivers serialized values as data chunks, never as scripts (RFC case 2)", async () => {
    const chunks = await renderToFrameStream(
      () => {
        sharedConfig.context.serialize("user", { name: "Ryan" });
        return r.ssr`<div>profile</div>`;
      },
      { frame: { id: "f1", version: 1 } }
    );
    const data = chunks.filter(c => c.type === "data");
    expect(data.length).toBe(1);
    expect(data[0]).toMatchObject({ id: "f1", version: 1 });
    expect(data[0].payload).toContain("Ryan");
    // Passive records only — no chunk carries document script text.
    for (const c of chunks) {
      if (c.html) expect(c.html).not.toContain("<script");
    }
    expect(chunks[0].type).toBe("start");
    expect(chunks[chunks.length - 1].type).toBe("complete");
  });

  it("streams an async fragment as fragment + eager reveal after the shell (RFC case 3)", async () => {
    let fragDone;
    const chunks = await collect(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          fragDone = ctx.registerFragment("p1");
          return r.ssr`<section><h1>Profile</h1><template id="pl-p1"></template><!--pl-p1--></section>`;
        },
        { frame: { id: "f2", version: 1 } }
      ),
      c => {
        if (c.type === "html") setTimeout(() => fragDone("<p>Loaded later</p>"));
      }
    );
    const html = typeIndex(chunks, "html");
    const fragment = typeIndex(chunks, "fragment");
    const reveal = typeIndex(chunks, "reveal");
    expect(chunks[html].html).toContain("<h1>Profile</h1>");
    expect(chunks[html].html).toContain("pl-p1");
    expect(chunks[fragment]).toEqual({
      type: "fragment",
      id: "f2",
      version: 1,
      key: "p1",
      html: "<p>Loaded later</p>"
    });
    expect(chunks[reveal]).toEqual({
      type: "reveal",
      id: "f2",
      version: 1,
      keys: ["p1"],
      waitForStyles: false
    });
    expect(html).toBeLessThan(fragment);
    expect(fragment).toBeLessThan(reveal);
    expect(chunks[chunks.length - 1].type).toBe("complete");
  });

  it("carries fragment styles as an assets chunk and a style-gated reveal (RFC case 4)", async () => {
    let fragDone;
    const chunks = await collect(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          fragDone = ctx.registerFragment("p1");
          return r.ssr`<div><template id="pl-p1"></template><!--pl-p1--></div>`;
        },
        { frame: { id: "f3", version: 1 } }
      ),
      c => {
        if (c.type === "html")
          setTimeout(() => {
            const ctx = sharedConfig.context;
            ctx._currentBoundaryId = "p1";
            ctx.registerAsset("style", "/assets/Profile.css");
            ctx._currentBoundaryId = null;
            fragDone("<article>Profile</article>");
          });
      }
    );
    const assets = typeIndex(chunks, "assets");
    const fragment = typeIndex(chunks, "fragment");
    expect(chunks[assets]).toEqual({
      type: "assets",
      id: "f3",
      version: 1,
      key: "p1",
      styles: ["/assets/Profile.css"]
    });
    expect(assets).toBeLessThan(fragment);
    expect(chunks.find(c => c.type === "reveal")).toEqual({
      type: "reveal",
      id: "f3",
      version: 1,
      keys: ["p1"],
      waitForStyles: true
    });
  });

  it("emits one grouped reveal in registration order, with no per-fragment reveals", async () => {
    let doneA, doneB, reveal;
    const chunks = await collect(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          doneA = ctx.registerFragment("fa", { revealGroup: "g" });
          doneB = ctx.registerFragment("fb", { revealGroup: "g" });
          reveal = () => ctx.revealFragments("g");
          return r.ssr`<div><template id="pl-fa"></template><!--pl-fa--><template id="pl-fb"></template><!--pl-fb--></div>`;
        },
        { frame: { id: "f4", version: 1 } }
      ),
      c => {
        if (c.type === "html")
          setTimeout(() => {
            // Resolve out of registration order; the reveal stays [fa, fb].
            doneB("<span>B</span>");
            doneA("<span>A</span>");
            reveal();
          });
      }
    );
    expect(chunks.filter(c => c.type === "fragment").map(c => c.key)).toEqual(["fb", "fa"]);
    const reveals = chunks.filter(c => c.type === "reveal");
    expect(reveals).toEqual([
      { type: "reveal", id: "f4", version: 1, keys: ["fa", "fb"], waitForStyles: false }
    ]);
  });

  it("marks fallback reveals and style-gates grouped reveals containing styled fragments", async () => {
    let doneA, showFallbacks, reveal;
    const chunks = await collect(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          doneA = ctx.registerFragment("fa", { revealGroup: "g" });
          showFallbacks = () => ctx.revealFallbacks("g");
          reveal = () => ctx.revealFragments("g");
          return r.ssr`<div><template id="pl-fa"><span>F</span></template><!--pl-fa--></div>`;
        },
        { frame: { id: "f5", version: 1 } }
      ),
      c => {
        if (c.type === "html")
          setTimeout(() => {
            showFallbacks();
            const ctx = sharedConfig.context;
            ctx._currentBoundaryId = "fa";
            ctx.registerAsset("style", "/fa.css");
            ctx._currentBoundaryId = null;
            doneA("<span>A</span>");
            reveal();
          });
      }
    );
    const reveals = chunks.filter(c => c.type === "reveal");
    expect(reveals[0]).toEqual({
      type: "reveal",
      id: "f5",
      version: 1,
      keys: ["fa"],
      waitForStyles: false,
      fallback: true
    });
    expect(reveals[1]).toEqual({
      type: "reveal",
      id: "f5",
      version: 1,
      keys: ["fa"],
      waitForStyles: true
    });
  });

  it("carries shell-level preloads as a root assets chunk before the html (RFC case 4 shell variant)", async () => {
    const chunks = await renderToFrameStream(
      () => {
        sharedConfig.context.registerAsset("module", "/entry.js");
        return r.ssr`<div>app</div>`;
      },
      { frame: { id: "f6", version: 1 } }
    );
    const assets = typeIndex(chunks, "assets");
    const html = typeIndex(chunks, "html");
    expect(chunks[assets]).toEqual({
      type: "assets",
      id: "f6",
      version: 1,
      key: "",
      modules: ["/entry.js"]
    });
    expect(assets).toBeLessThan(html);
  });

  it("emits late module assets as their own assets chunks", async () => {
    let fragDone;
    const chunks = await collect(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          fragDone = ctx.registerFragment("b1");
          return r.ssr`<div><template id="pl-b1"></template><!--pl-b1--></div>`;
        },
        { frame: { id: "f7", version: 1 } }
      ),
      c => {
        if (c.type === "html")
          setTimeout(() => {
            sharedConfig.context.registerAsset("module", "/late-chunk.js");
            fragDone("<span>B</span>");
          });
      }
    );
    expect(chunks.filter(c => c.type === "assets")).toEqual([
      { type: "assets", id: "f7", version: 1, key: "", modules: ["/late-chunk.js"] }
    ]);
  });

  it("addresses every chunk with the frame id and version", async () => {
    const chunks = await renderToFrameStream(() => r.ssr`<div>x</div>`, {
      frame: { id: "nested.0", version: 3 }
    });
    for (const c of chunks) {
      expect(c.id).toBe("nested.0");
      expect(c.version).toBe(3);
    }
  });
});
