/**
 * @jest-environment jsdom
 */
// The server-component convention, producer half: renderServerComponent
// renders a `props => JSX` function with a projection props proxy — prop
// reads become marker ranges the client fills, render-prop calls become
// occurrence-keyed slot chunks with codec-serialized args. Consumed by the
// real client runtime end to end.
import * as r from "../../src/server";
import { renderServerComponent } from "../../src/frame-sink";
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

function createTableHost(slots) {
  const table = createJSONDataTable();
  const host = createFrameHost({
    applyData: c => table.apply(c),
    resolve: ref => table.resolve(ref)
  });
  return { host, table, slots };
}

describe("renderServerComponent (projection emission)", () => {
  let boundary;
  beforeEach(() => {
    boundary = document.createElement("div");
    document.body.appendChild(boundary);
  });
  afterEach(() => boundary.remove());

  it("emits a direct-insert marker range for a prop placed as a child", async () => {
    const ServerComp = props => r.ssr`<section><h1>Story</h1>${props.children}</section>`;
    const chunks = await renderServerComponent(ServerComp, { frame: { id: "f0" } });
    const html = chunks.find(c => c.type === "html").html;
    expect(html).toBe(
      "<section><h1>Story</h1><!--proj:children:start--><!--proj:children:end--></section>"
    );
    // Direct insert: position only — no slot chunk, nothing serialized.
    expect(chunks.filter(c => c.type === "slot")).toEqual([]);
    expect(chunks.filter(c => c.type === "data")).toEqual([]);
  });

  it("fills the range with client content through the real consumer", async () => {
    const ServerComp = props => r.ssr`<div><p>server</p>${props.children}</div>`;
    const host = createFrameHost();
    const el = document.createElement("button");
    el.textContent = "client";
    createFrame(boundary, { host, id: "f1", slots: { children: () => el } });
    await streamInto(renderServerComponent(ServerComp, { frame: { id: "f1" } }), host);
    expect(boundary.innerHTML).toBe(
      "<div><p>server</p><!--proj:children:start--><button>client</button><!--proj:children:end--></div>"
    );
    expect(boundary.querySelector("button")).toBe(el);
  });

  it("emits one slot chunk per render-prop call with literal and serialized args", async () => {
    const items = ["a", "b"];
    const ServerComp = props =>
      r.ssr`<ul>${items.map((label, i) => props.item({ label, meta: { index: i } }))}</ul>`;
    const chunks = await renderServerComponent(ServerComp, { frame: { id: "f2" } });
    const slots = chunks.filter(c => c.type === "slot");
    expect(slots.map(c => c.key)).toEqual(["item#0", "item#1"]);
    // Primitives ride literally; objects become data refs.
    expect(slots[0].args).toEqual({ label: "a", meta: { $ref: "arg:item#0:meta" } });
    expect(slots[1].args).toEqual({ label: "b", meta: { $ref: "arg:item#1:meta" } });
    const html = chunks.find(c => c.type === "html").html;
    expect(html).toContain("<!--proj:item#0:start--><!--proj:item#0:end-->");
    expect(html).toContain("<!--proj:item#1:start--><!--proj:item#1:end-->");
    // The refs decode through the data table.
    const table = createJSONDataTable();
    for (const c of chunks.filter(x => x.type === "data")) table.apply(c);
    expect(table.resolve({ $ref: "arg:item#0:meta" })).toEqual({ index: 0 });
    expect(table.resolve({ $ref: "arg:item#1:meta" })).toEqual({ index: 1 });
  });

  it("invokes the client callback once per occurrence with resolved args", async () => {
    const ServerComp = props =>
      r.ssr`<ol>${["x", "y"].map((label, i) => props.item({ label, meta: { n: i } }))}</ol>`;
    const calls = [];
    const { host, table } = createTableHost();
    createFrame(boundary, {
      host,
      id: "f3",
      slots: {
        item: props => {
          calls.push(props);
          const li = document.createElement("b");
          li.textContent = `${props.label}:${props.meta.n}`;
          return li;
        }
      }
    });
    await streamInto(renderServerComponent(ServerComp, { frame: { id: "f3" } }), host);
    expect(calls.length).toBe(2);
    expect(boundary.textContent).toBe("x:0y:1");
    // The resolved arg is the table's decoded instance, not a copy.
    expect(calls[0].meta).toBe(table.resolve({ $ref: "arg:item#0:meta" }));
  });

  it("emits nothing for props the component never uses", async () => {
    const ServerComp = () => r.ssr`<div>static</div>`;
    const chunks = await renderServerComponent(ServerComp, { frame: { id: "f4" } });
    expect(chunks.find(c => c.type === "html").html).toBe("<div>static</div>");
    expect(chunks.filter(c => c.type === "slot")).toEqual([]);
  });

  it("preserves client slot state across a server-component re-render (policy A)", async () => {
    const ServerComp = version => props =>
      r.ssr`<article><h1>Story ${r.escape(String(version))}</h1>${props.children}</article>`;
    const host = createFrameHost();
    const toggle = document.createElement("input");
    createFrame(boundary, { host, id: "nav", slots: { children: () => toggle } });
    await streamInto(renderServerComponent(ServerComp(1), { frame: { id: "nav", version: 1 } }), host);
    // Client-only state the server must never see or reset:
    toggle.checked = true;
    const h1 = boundary.querySelector("h1");
    await streamInto(renderServerComponent(ServerComp(2), { frame: { id: "nav", version: 2 } }), host);
    // Server content morphed in place; the client-owned range and its state
    // survived the navigation.
    expect(boundary.querySelector("h1")).toBe(h1);
    expect(h1.textContent).toBe("Story 2");
    expect(boundary.querySelector("input")).toBe(toggle);
    expect(toggle.checked).toBe(true);
  });

  it("reveals a slot inside an async fragment and mounts its client content", async () => {
    let fragDone;
    const ServerComp = props => {
      const ctx = sharedConfig.context;
      fragDone = ctx.registerFragment("p1");
      return r.ssr`<div><template id="pl-p1"></template><!--pl-p1-->${props.footer}</div>`;
    };
    const host = createFrameHost();
    const em = document.createElement("em");
    em.textContent = "foot";
    const frame = createFrame(boundary, { host, id: "f5", slots: { footer: () => em } });
    await streamInto(renderServerComponent(ServerComp, { frame: { id: "f5" } }), host, chunk => {
      if (chunk.type === "html") setTimeout(() => fragDone("<p>late</p>"));
    });
    expect(frame.isRevealed("p1")).toBe(true);
    expect(boundary.innerHTML).toBe(
      "<div><p>late</p><!--proj:footer:start--><em>foot</em><!--proj:footer:end--></div>"
    );
  });
});
