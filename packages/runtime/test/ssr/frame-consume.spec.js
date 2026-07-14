/**
 * @jest-environment jsdom
 */
// Level-4 smoke: chunks produced by renderToFrameStream are consumable into
// DOM. A minimal in-test applier stands in for the (not yet ported) client
// frame runtime — it honors the document marker vocabulary the producer
// emits: fragment placeholder ranges are `<template id="pl-KEY">` ...
// `<!--pl-KEY-->`, and data payloads are eval-style Seroval records applied
// against the `_$HY.r` table. The real consumer (the spike's reconciler +
// slot model) replaces this; these tests pin the produce→consume contract.
import * as r from "../../src/server";
import { renderToFrameStream } from "../../src/frame-sink";
import { getLocalHeaderScript } from "../../src/serializer";
import { sharedConfig } from "rxcore";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

// Swap a fragment's HTML into its placeholder range, removing the markers —
// the passive-record equivalent of the document $df task.
function swapFragment(boundary, key, html) {
  const tpl = boundary.querySelector(`template[id="pl-${key}"]`);
  if (!tpl) throw new Error(`missing placeholder for ${key}`);
  const parent = tpl.parentNode;
  let node = tpl.nextSibling;
  while (node && !(node.nodeType === 8 && node.nodeValue === `pl-${key}`)) {
    const next = node.nextSibling;
    parent.removeChild(node);
    node = next;
  }
  if (!node) throw new Error(`missing range end for ${key}`);
  const content = document.createElement("template");
  content.innerHTML = html;
  parent.insertBefore(content.content, node);
  tpl.remove();
  node.remove();
}

function createFrameApplier(boundary) {
  const fragments = new Map();
  const payloads = [];
  return {
    payloads,
    apply(chunk) {
      switch (chunk.type) {
        case "html":
          boundary.innerHTML = chunk.html;
          break;
        case "fragment":
          fragments.set(chunk.key, chunk.html);
          break;
        case "reveal":
          if (chunk.fallback) break; // no fallback materialization in the smoke applier
          for (const key of chunk.keys) swapFragment(boundary, key, fragments.get(key));
          break;
        case "data":
          payloads.push(chunk.payload);
          break;
      }
    }
  };
}

function consume(stream, boundary, onChunk) {
  const applier = createFrameApplier(boundary);
  return new Promise(resolve => {
    stream.pipe({
      write(chunk) {
        applier.apply(chunk);
        onChunk && onChunk(chunk);
      },
      end: () => resolve(applier)
    });
  });
}

describe("frame chunk consumption (produce → apply → DOM)", () => {
  let boundary;
  beforeEach(() => {
    boundary = document.createElement("div");
    document.body.appendChild(boundary);
  });
  afterEach(() => boundary.remove());

  it("applies a synchronous frame into the boundary", async () => {
    await consume(
      renderToFrameStream(() => r.ssr`<section>Hello</section>`, { frame: { id: "f0" } }),
      boundary
    );
    expect(boundary.innerHTML).toBe("<section>Hello</section>");
  });

  it("reveals an async fragment into its placeholder range and removes the markers", async () => {
    let fragDone;
    let placeholderSeen = false;
    await consume(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          fragDone = ctx.registerFragment("p1");
          return r.ssr`<section><h1>Profile</h1><template id="pl-p1"></template><!--pl-p1--></section>`;
        },
        { frame: { id: "f1" } }
      ),
      boundary,
      chunk => {
        if (chunk.type === "html") {
          placeholderSeen = !!boundary.querySelector('template[id="pl-p1"]');
          setTimeout(() => fragDone("<p>Loaded later</p>"));
        }
      }
    );
    expect(placeholderSeen).toBe(true);
    expect(boundary.innerHTML).toBe("<section><h1>Profile</h1><p>Loaded later</p></section>");
  });

  it("applies a grouped reveal into both ranges regardless of resolve order", async () => {
    let doneA, doneB, reveal;
    await consume(
      renderToFrameStream(
        () => {
          const ctx = sharedConfig.context;
          doneA = ctx.registerFragment("fa", { revealGroup: "g" });
          doneB = ctx.registerFragment("fb", { revealGroup: "g" });
          reveal = () => ctx.revealFragments("g");
          return r.ssr`<ul><li><template id="pl-fa"></template><!--pl-fa--></li><li><template id="pl-fb"></template><!--pl-fb--></li></ul>`;
        },
        { frame: { id: "f2" } }
      ),
      boundary,
      chunk => {
        if (chunk.type === "html")
          setTimeout(() => {
            doneB("<span>B</span>");
            doneA("<span>A</span>");
            reveal();
          });
      }
    );
    expect(boundary.innerHTML).toBe("<ul><li><span>A</span></li><li><span>B</span></li></ul>");
  });

  it("data payloads evaluate against the _$HY.r record table", async () => {
    const applier = await consume(
      renderToFrameStream(
        () => {
          sharedConfig.context.serialize("user", { name: "Ryan", tags: ["a", "b"] });
          return r.ssr`<div>u</div>`;
        },
        { frame: { id: "f3" } }
      ),
      boundary
    );
    globalThis._$HY = { r: {} };
    // The consumer's bootstrap: the response-scoped cross-reference header,
    // then each data payload, applied as passive records.
    (0, eval)(getLocalHeaderScript(""));
    for (const payload of applier.payloads) (0, eval)(payload);
    expect(globalThis._$HY.r.user).toEqual({ name: "Ryan", tags: ["a", "b"] });
    delete globalThis._$HY;
  });
});
