/**
 * @jest-environment jsdom
 */
// Level-4 smoke: chunks produced by renderToFrameStream are consumable into
// DOM with a minimal in-test applier that is independent of the real client
// runtime (frame-client.js) — it pins the produce→consume contract from
// first principles: fragment placeholder ranges are `<template id="pl-KEY">`
// ... `<!--pl-KEY-->`, and data records are keyed SerovalNode chunks decoded
// through the JSON codec table, no eval.
import * as r from "../../src/server";
import { renderToFrameStream } from "../../src/frame-sink";
import { createJSONDataTable } from "../../src/serializer";
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
  const data = [];
  return {
    data,
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
          data.push(chunk);
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

  it("data records decode through the JSON codec table, no eval", async () => {
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
    const table = createJSONDataTable();
    for (const record of applier.data) table.apply(record);
    expect(table.get("user")).toEqual({ name: "Ryan", tags: ["a", "b"] });
  });
});
