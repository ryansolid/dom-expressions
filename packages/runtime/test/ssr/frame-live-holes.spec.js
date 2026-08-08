/**
 * @jest-environment jsdom
 *
 * Live markup holes (Stage 3, server half): the DR-2 binding ledger
 * generalized from slot args to insert positions. In a live frame render
 * (renderServerComponent — the call-driven face), every thunk-compiled
 * content hole is marked with an identified comment pair in the flushed
 * HTML and opens a ledger binding; commits the response observes re-run
 * the thunk, equality-gate the resolved HTML, and re-emit changed holes
 * as keyed `hole` chunks the client morphs in place.
 *
 * What is NOT live, by design:
 *   - eagerly-evaluated holes (compiled static: `_$escape(x)` without a
 *     thunk) — same rule as client reactivity;
 *   - in-tag (attribute-position) holes — the attr slice addresses them
 *     by element, not by range (markers can't sit inside a tag);
 *   - the document face (t=0): holes latch to their V1 snapshot — the
 *     first-value lock. Liveness at t=0 is Stage 4.
 */
import * as r from "../../src/server";
import {
  renderServerComponent,
  frameTransformDirectResult,
  ServerComponentPlugin
} from "../../src/frame-sink";
import { createJSONDataTable } from "../../src/serializer";
import { createFrame, createFrameHost } from "../../src/frame-client";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

function collectStream(component, frame = { id: "f", version: 1 }) {
  return new Promise(resolve => {
    const chunks = [];
    renderServerComponent(component, { frame }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks)
    });
  });
}

function collectDocument(component, clientProps, id = "f") {
  return new Promise(resolve => {
    const Inline = frameTransformDirectResult(component, { id });
    const chunks = [];
    r.renderToStream(() => Inline(clientProps), { plugins: [ServerComponentPlugin] }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks.join(""))
    });
  });
}

const shellOf = chunks => chunks.find(c => c.type === "html" && c.id === "f");
const holesOf = chunks => chunks.filter(c => c.type === "hole");

describe("live content holes — marking (stream face)", () => {
  it("a thunk content hole is wrapped in an identified marker pair", async () => {
    const text = "hello";
    const chunks = await collectStream(() =>
      r.ssr(["<section>", "</section>"], () => r.escape(text))
    );
    const shell = shellOf(chunks);
    expect(shell.html).toMatch(/<section><!--lh:\d+-->hello<!--lh:\/\d+--><\/section>/);
    // The open and close markers carry the same id.
    const [, openId] = shell.html.match(/<!--lh:(\d+)-->/);
    expect(shell.html).toContain(`<!--lh:/${openId}-->`);
  });

  it("an eager (static-compiled) hole gets no marker and no binding", async () => {
    // Compiled static: the expression evaluated at template build, not a thunk.
    const chunks = await collectStream(() =>
      r.ssr(["<section>", "</section>"], r.escape("static"))
    );
    const shell = shellOf(chunks);
    expect(shell.html).toBe("<section>static</section>");
    expect(holesOf(chunks)).toHaveLength(0);
  });

  it("an in-tag hole (attribute position) is not range-marked", async () => {
    // `<div class={sig()}>` compiles the hole between `class="` and `"` —
    // inside the tag, where no comment can sit. The attr slice addresses
    // these by element; slice 1 must simply not corrupt the tag.
    const chunks = await collectStream(() =>
      r.ssr(['<div class="', '">x</div>'], () => r.escape("a", true))
    );
    const shell = shellOf(chunks);
    expect(shell.html).toBe('<div class="a">x</div>');
  });

  it("slot positions are never marked: a slot is a client-owned constant", async () => {
    // Both shapes of a slot read — the getter placed directly as a child
    // (`{props.children}`, a function-shaped hole) and a called occurrence
    // (`props.row({...})`, a range-valued hole) — resolve to their marker
    // ranges with no lh wrapper: the server can never re-render a slot, so
    // a binding over one would be permanently inert.
    const chunks = await collectStream(props =>
      r.ssr(["<div>", "<!--x-->", "</div>"], props.children, () => props.row({ n: 1 }))
    );
    const shell = shellOf(chunks);
    expect(shell.html).not.toContain("lh:");
    expect(shell.html).toContain("<!--slot:children:start--><!--slot:children:end-->");
    expect(shell.html).toMatch(/<!--slot:row#0:start--><!--slot:row#0:end-->/);
  });

  it("a hole that emits slot records latches: records are emit-once", async () => {
    // A thunk whose evaluation CALLS a slot (`props.row({...})` inside the
    // hole) emits a slot record — occurrence identity is positional, so
    // re-running the thunk would mint fresh occurrences and re-serialize
    // args (the double-data disease). Such a hole gets no marker and no
    // binding; a later commit re-emits nothing and mints no new records.
    let resolveGate;
    const gate = new Promise(res => (resolveGate = res));
    const pending = collectStream(props =>
      r.ssr(["<div>", "<!--x-->", "</div>"], () => props.row({ n: 1 }), [props.other({ gate })])
    );
    await Promise.resolve();
    resolveGate("done");
    const chunks = await pending;
    const shell = shellOf(chunks);
    expect(shell.html).not.toContain("lh:");
    expect(holesOf(chunks)).toHaveLength(0);
    // Exactly one `row` record — the sweep did not re-run the slot call.
    const rowSlots = chunks.filter(c => c.type === "slot" && /^row#/.test(c.key));
    expect(rowSlots).toHaveLength(1);
    expect(rowSlots[0].key).toBe("row#0");
  });

  it("the document face does not mark holes: t=0 latches to the V1 snapshot", async () => {
    const html = await collectDocument(() =>
      r.ssr(["<section>", "</section>"], () => r.escape("v1"))
    );
    expect(html).toContain("v1");
    expect(html).not.toContain("lh:");
  });
});

describe("live content holes — client morph", () => {
  let boundary;
  beforeEach(() => {
    boundary = document.createElement("div");
    document.body.appendChild(boundary);
  });
  afterEach(() => boundary.remove());

  function streamInto(stream, host) {
    return new Promise(resolve => {
      stream.pipe({ write: c => host.apply(c), end: resolve });
    });
  }

  function tableHost() {
    const table = createJSONDataTable();
    return createFrameHost({ applyData: c => table.apply(c), resolve: ref => table.resolve(ref) });
  }

  const slots = { row: () => document.createElement("span") };

  it("a hole re-emission morphs the marked range in place", async () => {
    let n = 1;
    let resolveGate;
    const gate = new Promise(res => (resolveGate = res));
    const ServerComp = props =>
      r.ssr(["<section><p>", "</p><!--x-->", "</section>"], () => r.escape(String(n)), [
        props.row({ gate })
      ]);
    const host = tableHost();
    createFrame(boundary, { host, id: "f", slots });
    const pending = streamInto(renderServerComponent(ServerComp, { frame: { id: "f" } }), host);
    await new Promise(res => setTimeout(res, 0));
    // The shell applied with V1 between the markers.
    expect(boundary.querySelector("p").textContent).toBe("1");
    n = 2;
    resolveGate("done");
    await pending;
    // The commit's re-emission morphed the range; markers persist for the
    // next update.
    const p = boundary.querySelector("p");
    expect(p.textContent).toBe("2");
    expect(p.innerHTML).toMatch(/<!--lh:(\d+)-->2<!--lh:\/\1-->/);
  });

  it("interior element identity survives a hole morph", async () => {
    let label = "first";
    let resolveGate;
    const gate = new Promise(res => (resolveGate = res));
    const ServerComp = props =>
      r.ssr(["<div>", "<!--x-->", "</div>"], () => r.ssr(["<em>", "</em>"], r.escape(label)), [
        props.row({ gate })
      ]);
    const host = tableHost();
    createFrame(boundary, { host, id: "f", slots });
    const pending = streamInto(renderServerComponent(ServerComp, { frame: { id: "f" } }), host);
    await new Promise(res => setTimeout(res, 0));
    const em = boundary.querySelector("em");
    expect(em.textContent).toBe("first");
    label = "second";
    resolveGate("done");
    await pending;
    // The reconcile morphs the element, not replaces it — same node.
    expect(boundary.querySelector("em")).toBe(em);
    expect(em.textContent).toBe("second");
  });

  it("a remount replays the latest hole value over the warm store's shell", async () => {
    let n = 1;
    let resolveGate;
    const gate = new Promise(res => (resolveGate = res));
    const ServerComp = props =>
      r.ssr(["<section><p>", "</p><!--x-->", "</section>"], () => r.escape(String(n)), [
        props.row({ gate })
      ]);
    const host = tableHost();
    const first = createFrame(boundary, { host, id: "f", slots });
    const pending = streamInto(renderServerComponent(ServerComp, { frame: { id: "f" } }), host);
    await new Promise(res => setTimeout(res, 0));
    n = 2;
    resolveGate("done");
    await pending;
    expect(boundary.querySelector("p").textContent).toBe("2");
    first.dispose();
    // A fresh mount seeds from the resident store: the root record holds
    // the V1 shell, and the hole record replays the latched final value —
    // retention shows what the last stream showed, not its first flush.
    const boundary2 = document.createElement("div");
    document.body.appendChild(boundary2);
    createFrame(boundary2, { host, id: "f", slots });
    expect(boundary2.querySelector("p").textContent).toBe("2");
    boundary2.remove();
  });
});

describe("live content holes — the ledger (stream face)", () => {
  it("a commit re-emits a changed hole as a keyed hole chunk", async () => {
    let n = 1;
    let resolveGate;
    const gate = new Promise(res => (resolveGate = res));
    const pending = collectStream(props =>
      r.ssr(
        ["<section>", "<!--x-->", "</section>"],
        () => r.escape(String(n)),
        // A serialized promise provides the commit: its resolution flushes
        // through the sink and sweeps the ledger.
        [props.row({ gate })]
      )
    );
    await Promise.resolve();
    n = 2;
    resolveGate("done");
    const chunks = await pending;
    const shell = shellOf(chunks);
    const [, id] = shell.html.match(/<!--lh:(\d+)-->1<!--lh:\/\1-->/) || [];
    expect(id).toBeDefined();
    const holes = holesOf(chunks);
    expect(holes.length).toBe(1);
    expect(holes[0].key).toBe(`lh:${id}`);
    expect(holes[0].html).toBe("2");
    expect(holes[0].id).toBe("f");
    // The re-emit precedes completion — the final value is latched.
    expect(chunks.indexOf(holes[0])).toBeLessThan(chunks.findIndex(c => c.type === "complete"));
  });

  it("an unchanged hole does not re-emit: the sweep is equality-gated", async () => {
    let resolveGate;
    const gate = new Promise(res => (resolveGate = res));
    const pending = collectStream(props =>
      r.ssr(["<section>", "<!--x-->", "</section>"], () => r.escape("same"), [props.row({ gate })])
    );
    await Promise.resolve();
    resolveGate("done");
    const chunks = await pending;
    expect(holesOf(chunks)).toHaveLength(0);
  });

  it("a hole over template content re-emits the resolved subtree html", async () => {
    let items = ["a"];
    let resolveGate;
    const gate = new Promise(res => (resolveGate = res));
    const pending = collectStream(props =>
      r.ssr(
        ["<ul>", "<!--x-->", "</ul>"],
        () => items.map(t => r.ssr(["<li>", "</li>"], r.escape(t))),
        [props.row({ gate })]
      )
    );
    await Promise.resolve();
    items = ["a", "b"];
    resolveGate("done");
    const chunks = await pending;
    const holes = holesOf(chunks);
    expect(holes.length).toBe(1);
    expect(holes[0].html).toBe("<li>a</li><li>b</li>");
  });

  it("multiple commits drive at most one re-emit each; the end latch ships the last value", async () => {
    let n = 0;
    const gates = [];
    const mkGate = () => new Promise(res => gates.push(res));
    const g1 = mkGate();
    const g2 = mkGate();
    const pending = collectStream(props =>
      r.ssr(["<section>", "<!--x-->", "</section>"], () => r.escape(String(n)), [
        props.row({ g1, g2 })
      ])
    );
    await Promise.resolve();
    n = 1;
    gates[0]("one");
    await new Promise(res => setTimeout(res, 0));
    n = 2;
    gates[1]("two");
    const chunks = await pending;
    const holes = holesOf(chunks);
    expect(holes.map(h => h.html)).toEqual(["1", "2"]);
    const completeIdx = chunks.findIndex(c => c.type === "complete");
    expect(chunks.indexOf(holes[1])).toBeLessThan(completeIdx);
  });
});
