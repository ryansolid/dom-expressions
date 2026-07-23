/**
 * @jest-environment jsdom
 */
// Level-4/5 integration: renderToFrameStream (producer) feeding the real
// client frame runtime (frame-client.js) — no in-test applier. Covers the
// produce→host→frame→DOM loop, host buffering for out-of-order delivery,
// fallback reveals, data routing, and sync document/frame parity.
import * as r from "../../src/server";
import { renderToFrameStream } from "../../src/frame-sink";
import { createJSONDataTable } from "../../src/serializer";
import { createFrame, createFrameHost } from "../../src/frame-client";
import { sharedConfig } from "rxcore";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

function streamInto(stream, host, onChunk) {
  return new Promise(resolve => {
    stream.pipe({
      write(chunk) {
        host.apply(chunk);
        onChunk && onChunk(chunk);
      },
      end: resolve
    });
  });
}

// Normalize an HTML string through the DOM so serialization details
// (attribute quoting) don't produce false diffs against live innerHTML.
function normalize(html) {
  const t = document.createElement("template");
  t.innerHTML = html;
  const div = document.createElement("div");
  div.appendChild(t.content);
  return div.innerHTML;
}

describe("frame stream → client frame runtime", () => {
  let boundary;
  beforeEach(() => {
    boundary = document.createElement("div");
    document.body.appendChild(boundary);
  });
  afterEach(() => boundary.remove());

  it("parity: a sync component renders identically via document SSR and via frame stream (minus hydration keys — streams are server-owned NoHydration zones)", async () => {
    const Comp = () =>
      r.ssrElement(
        "section",
        { class: "card", "data-x": "1" },
        r.ssr`<h1>Title</h1><p>Body &lt;text&gt;</p>`,
        true
      );
    const documentHtml = r.renderToString(Comp);
    // Document SSR of a bare (non-frame) render keys its elements for
    // hydration; frame streams never carry `_hk` — post-load content is
    // adopted, not hydrated, so keys would be pure wire tax.
    expect(documentHtml).toContain("_hk=");
    const host = createFrameHost();
    createFrame(boundary, { host, id: "f0" });
    await streamInto(renderToFrameStream(Comp, { frame: { id: "f0" } }), host);
    expect(boundary.innerHTML).toBe(
      normalize(documentHtml.replace(/ _hk=(?:"[^"]*"|[^ >]+)/g, ""))
    );
  });

  it("reveals a produced async fragment through the real consumer", async () => {
    let fragDone;
    const host = createFrameHost();
    const frame = createFrame(boundary, { host, id: "f1" });
    await streamInto(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          fragDone = ctx.registerFragment("p1");
          return r.ssr`<section><h1>Profile</h1><template id="pl-p1"></template><!--pl-p1--></section>`;
        },
        { frame: { id: "f1" } }
      ),
      host,
      chunk => {
        if (chunk.type === "html") {
          expect(boundary.querySelector('template[id="pl-p1"]')).toBeTruthy();
          expect(frame.isRevealed("p1")).toBe(false);
          setTimeout(() => fragDone("<p>Loaded later</p>"));
        }
      }
    );
    expect(frame.isRevealed("p1")).toBe(true);
    expect(boundary.innerHTML).toBe("<section><h1>Profile</h1><p>Loaded later</p></section>");
  });

  it("buffers the whole stream when the frame registers after delivery", async () => {
    let fragDone;
    const host = createFrameHost();
    await streamInto(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          fragDone = ctx.registerFragment("p1");
          return r.ssr`<div><template id="pl-p1"></template><!--pl-p1--></div>`;
        },
        { frame: { id: "late" } }
      ),
      host,
      chunk => {
        if (chunk.type === "html") setTimeout(() => fragDone("<span>L</span>"));
      }
    );
    // Every chunk (including fragment + reveal) arrived before the frame
    // existed; registration flushes the buffer in order.
    const frame = createFrame(boundary, { host, id: "late" });
    expect(frame.isRevealed("p1")).toBe(true);
    expect(boundary.innerHTML).toBe("<div><span>L</span></div>");
  });

  it("materializes fallbacks on a fallback reveal, then resolves past them", async () => {
    let doneA, showFallbacks, reveal;
    const host = createFrameHost();
    createFrame(boundary, { host, id: "f2" });
    let sawFallback = null;
    await streamInto(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          doneA = ctx.registerFragment("fa", { revealGroup: "g" });
          showFallbacks = () => ctx.revealFallbacks("g");
          reveal = () => ctx.revealFragments("g");
          return r.ssr`<div><template id="pl-fa"><em>waiting…</em></template><!--pl-fa--></div>`;
        },
        { frame: { id: "f2" } }
      ),
      host,
      chunk => {
        if (chunk.type === "html") {
          setTimeout(() => {
            showFallbacks();
            // The fallback chunk has been applied by the time the next chunk
            // is produced; capture what the boundary showed.
            sawFallback = boundary.innerHTML;
            doneA("<strong>ready</strong>");
            reveal();
          });
        }
      }
    );
    expect(sawFallback).toContain("<em>waiting…</em>");
    expect(boundary.innerHTML).toBe("<div><strong>ready</strong></div>");
  });

  it("gates a produced styled fragment's reveal on stylesheet load, end to end", async () => {
    let fragDone;
    const host = createFrameHost();
    const frame = createFrame(boundary, { host, id: "fs" });
    await streamInto(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          fragDone = ctx.registerFragment("p1");
          return r.ssr`<div><template id="pl-p1"></template><!--pl-p1--></div>`;
        },
        { frame: { id: "fs" } }
      ),
      host,
      chunk => {
        if (chunk.type === "html")
          setTimeout(() => {
            const ctx = sharedConfig.context;
            ctx._currentBoundaryId = "p1";
            ctx.registerAsset("style", "/frag.css");
            ctx._currentBoundaryId = null;
            fragDone("<p>styled</p>");
          });
      }
    );
    // Stream is complete but the stylesheet hasn't settled: still gated.
    expect(frame.isRevealed("p1")).toBe(false);
    const link = [...document.head.querySelectorAll("link")].find(
      l => l.getAttribute("href") === "/frag.css"
    );
    expect(link).toBeTruthy();
    link.dispatchEvent(new Event("load"));
    expect(frame.isRevealed("p1")).toBe(true);
    expect(boundary.innerHTML).toBe("<div><p>styled</p></div>");
    link.remove();
  });

  it("delivers keyed codec data records the table decodes without eval", async () => {
    const table = createJSONDataTable();
    const host = createFrameHost({ applyData: c => table.apply(c) });
    createFrame(boundary, { host, id: "f3" });
    await streamInto(
      renderToFrameStream(
        () => {
          sharedConfig.context.serialize("user", { name: "Ryan", tags: ["a", "b"] });
          return r.ssr`<div>u</div>`;
        },
        { frame: { id: "f3" } }
      ),
      host
    );
    expect(table.get("user")).toEqual({ name: "Ryan", tags: ["a", "b"] });
  });

  it("dedupes a value referenced across keyed writes to one decoded instance", async () => {
    const table = createJSONDataTable();
    const host = createFrameHost({ applyData: c => table.apply(c) });
    createFrame(boundary, { host, id: "f4" });
    await streamInto(
      renderToFrameStream(
        () => {
          const shared = { n: 1 };
          sharedConfig.context.serialize("a", { shared });
          sharedConfig.context.serialize("b", { shared });
          return r.ssr`<div>d</div>`;
        },
        { frame: { id: "f4" } }
      ),
      host
    );
    expect(table.get("a").shared).toEqual({ n: 1 });
    // Referential dedupe across writes: one instance on the wire, one after
    // decode — the no-double-serialize invariant at the codec level.
    expect(table.get("b").shared).toBe(table.get("a").shared);
  });

  it("streams a promise as an initial node plus a patch that resolves it", async () => {
    const table = createJSONDataTable();
    const host = createFrameHost({ applyData: c => table.apply(c) });
    createFrame(boundary, { host, id: "f5" });
    await streamInto(
      renderToFrameStream(
        () => {
          sharedConfig.context.serialize("later", Promise.resolve(42));
          return r.ssr`<div>p</div>`;
        },
        { frame: { id: "f5" } }
      ),
      host
    );
    const value = table.get("later");
    expect(typeof value.then).toBe("function");
    await expect(value).resolves.toBe(42);
  });

  it("async parity: an activated document stream and a frame stream converge to the same DOM", async () => {
    // One component definition, rendered twice (fresh fragment resolver per
    // run) so both paths see identical markup and hydration ids.
    const makeRun = () => {
      let fragDone;
      return {
        Comp: () => {
          const ctx = sharedConfig.context;
          fragDone = ctx.registerFragment("p1");
          return r.ssr`<section><h1>Page</h1><template id="pl-p1"><em>loading</em></template><!--pl-p1--></section>`;
        },
        resolve: v => fragDone(v)
      };
    };

    // Document path: collect the streamed html, then activate it the way a
    // browser would — parse it, then evaluate its inline task scripts (the
    // $df runtime piggybacks on the first task).
    const doc = makeRun();
    const htmlChunks = [];
    await new Promise(res => {
      r.renderToStream(doc.Comp).pipe({
        write(v) {
          htmlChunks.push(v);
          if (htmlChunks.length === 1) setTimeout(() => doc.resolve("<p>Loaded</p>"));
        },
        end: res
      });
    });
    const docBoundary = document.createElement("div");
    document.body.appendChild(docBoundary);
    globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, fe() {} };
    docBoundary.innerHTML = htmlChunks.join("");
    const scripts = [...docBoundary.querySelectorAll("script")];
    for (const s of scripts) (0, eval)(s.textContent);
    for (const s of scripts) s.remove();
    delete globalThis._$HY;

    // Frame path: same component through the chunk stream and the real
    // consumer.
    const frameRun = makeRun();
    const host = createFrameHost();
    createFrame(boundary, { host, id: "pp" });
    await streamInto(renderToFrameStream(frameRun.Comp, { frame: { id: "pp" } }), host, chunk => {
      if (chunk.type === "html") setTimeout(() => frameRun.resolve("<p>Loaded</p>"));
    });

    expect(boundary.innerHTML).toBe(docBoundary.innerHTML);
    expect(boundary.innerHTML).toContain("<p>Loaded</p>");
    expect(boundary.innerHTML).not.toContain("pl-p1");
    docBoundary.remove();
  });

  it("morphs a repeat render of the same frame id in place (policy A)", async () => {
    const Comp = version => () =>
      r.ssr`<section><h1>Story ${r.escape(String(version))}</h1><p>body</p></section>`;
    const host = createFrameHost();
    createFrame(boundary, { host, id: "nav" });
    await streamInto(renderToFrameStream(Comp(1), { frame: { id: "nav", version: 1 } }), host);
    const h1 = boundary.querySelector("h1");
    const p = boundary.querySelector("p");
    await streamInto(renderToFrameStream(Comp(2), { frame: { id: "nav", version: 2 } }), host);
    // Same nodes, updated text: the version bump morphed, not replaced.
    expect(boundary.querySelector("h1")).toBe(h1);
    expect(boundary.querySelector("p")).toBe(p);
    expect(h1.textContent).toBe("Story 2");
  });
});
