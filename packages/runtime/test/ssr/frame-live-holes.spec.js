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
 *   - hostless document renders (no streaming serializer / no
 *     ReadableStream): holes latch to their V1 snapshot — the first-value
 *     lock. The ARMED document face (Stage 4, one engine per document
 *     gated to server-component scope, ops over an `sc:live` channel
 *     record) is pinned by frame-live-holes-document.spec.js.
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

  it("an in-tag hole (attribute position) is element-addressed, never range-marked", async () => {
    // `<div class={sig()}>` compiles the hole between `class="` and `"` —
    // inside the tag, where no comment can sit. The attr slice addresses
    // the ELEMENT instead: a `data-lha` injected at the tag open, no
    // markers, tag structure intact.
    const chunks = await collectStream(() =>
      r.ssr(['<div class="', '">x</div>'], () => r.escape("a", true))
    );
    const shell = shellOf(chunks);
    expect(shell.html).toBe('<div data-lha="0" class="a">x</div>');
    expect(shell.html).not.toContain("lh:");
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

  it("the document face degrades to the t=0 latch when no channel host exists", async () => {
    // Stage 4 arms the document face through an `sc:live` ReadableStream
    // record (frame-live-holes-document.spec.js pins that contract, in the
    // node environment). This spec runs under jsdom-without-streams — the
    // hostless fallback: no channel means no marking, V1 latches.
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

describe("live content holes — lifetime and error semantics (stream face)", () => {
  it("supersession: a parent re-emission retires its interior holes", async () => {
    // Nested live holes: the outer thunk's html CONTAINS the inner's
    // content, so any inner change also changes the outer — the outer's
    // wholesale re-emission supersedes the inner binding (its markers are
    // gone from the morphed range; mint-suppressed sweeps produce no new
    // ones). After the first re-emission, updates collapse to the parent
    // key: no inner-keyed chunk ever follows a parent re-emit.
    let inner = "a";
    const gates = [];
    const mkGate = () => new Promise(res => gates.push(res));
    const g1 = mkGate();
    const g2 = mkGate();
    const pending = collectStream(props =>
      r.ssr(
        ["<section>", "<!--x-->", "</section>"],
        () => r.ssr(["<div><em>", "</em></div>"], () => r.escape(inner)),
        [props.row({ g1, g2 })]
      )
    );
    await Promise.resolve();
    inner = "b";
    gates[0]("one");
    await new Promise(res => setTimeout(res, 0));
    inner = "c";
    gates[1]("two");
    const chunks = await pending;
    const shell = shellOf(chunks);
    // Two bindings minted at first render: outer wraps inner.
    const ids = [...shell.html.matchAll(/<!--lh:(\d+)-->/g)].map(m => m[1]);
    expect(ids).toHaveLength(2);
    const [outerId, innerId] = ids;
    const holes = holesOf(chunks);
    const outerEmits = holes.filter(h => h.key === `lh:${outerId}`);
    const innerEmits = holes.filter(h => h.key === `lh:${innerId}`);
    // The outer re-emitted for both commits; its html is marker-free
    // (sweeps are mint-suppressed) — the inner range is superseded.
    expect(outerEmits.map(h => h.html)).toEqual(["<div><em>b</em></div>", "<div><em>c</em></div>"]);
    for (const h of outerEmits) expect(h.html).not.toContain("lh:");
    // The inner binding retired with the first parent re-emission: at most
    // its same-commit sweep (registration order runs it first) — never one
    // after the parent's chunk shipped.
    const firstOuterIdx = chunks.indexOf(outerEmits[0]);
    for (const h of innerEmits) expect(chunks.indexOf(h)).toBeLessThan(firstOuterIdx);
  });

  it("a real error on sweep is terminal: the hole latches and a keyed error ships", async () => {
    let n = 1;
    let boom = false;
    const gates = [];
    const mkGate = () => new Promise(res => gates.push(res));
    const g1 = mkGate();
    const g2 = mkGate();
    const pending = collectStream(props =>
      r.ssr(
        ["<section>", "<!--x-->", "</section>"],
        () => {
          if (boom) throw new Error("sweep failed");
          return r.escape(String(n));
        },
        [props.row({ g1, g2 })]
      )
    );
    await Promise.resolve();
    boom = true;
    gates[0]("one");
    await new Promise(res => setTimeout(res, 0));
    // A later commit finds the binding closed: no resurrection, no throw.
    boom = false;
    n = 3;
    gates[1]("two");
    const chunks = await pending;
    const shell = shellOf(chunks);
    const [, id] = shell.html.match(/<!--lh:(\d+)-->1<!--lh:\/\1-->/) || [];
    expect(id).toBeDefined();
    // No hole chunk ever shipped — the marked range latched at "1".
    expect(holesOf(chunks)).toHaveLength(0);
    // The failure surfaced as a hole-keyed error chunk, message normalized
    // to a string (same shape as the stream-level error path).
    const errors = chunks.filter(c => c.type === "error" && c.key === `lh:${id}`);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toBe("sweep failed");
    // The stream still completed: a hole failure is not a stream failure.
    expect(chunks.some(c => c.type === "complete")).toBe(true);
  });

  it("attr holes: a tag with in-tag thunk holes is element-addressed and re-emits on commit", async () => {
    // `<div class={sig()}>` — the in-tag hole can't carry comment markers,
    // so the engine injects a runtime address (`data-lha`) into the tag and
    // opens an element-keyed binding: commits re-run the tag's holes,
    // rebuild its attribute text, and ship changes as `attr` chunks.
    let cls = "a";
    let resolveGate;
    const gate = new Promise(res => (resolveGate = res));
    const pending = collectStream(props =>
      r.ssr(['<section><div class="', '">x</div><!--x--></section>'], () => r.escape(cls, true), [
        props.row({ gate })
      ])
    );
    await Promise.resolve();
    cls = "b";
    resolveGate("done");
    const chunks = await pending;
    const shell = shellOf(chunks);
    const [, addr] = shell.html.match(/<div data-lha="(\d+)" class="a">/) || [];
    expect(addr).toBeDefined();
    const attrs = chunks.filter(c => c.type === "attr");
    expect(attrs).toHaveLength(1);
    expect(attrs[0].key).toBe(addr);
    expect(attrs[0].attrs).toBe(' class="b"');
  });

  it("attr holes: a group spanning elements yields per-element bindings, equality-gated", async () => {
    // The compiler batches contiguous dynamic attrs into ONE ssrGroup even
    // across elements. Each element still gets its own address and binding —
    // a commit that changes one element's expression re-emits that element
    // only.
    let clsA = "a1";
    const styleB = "color:red";
    const clsC = "c1";
    let resolveGate;
    const gate = new Promise(res => (resolveGate = res));
    const group = r.ssrGroup(
      () => [r.ssrClassName(clsA), r.ssrStyle(styleB), r.ssrClassName(clsC)],
      3
    );
    const pending = collectStream(props =>
      r.ssr(
        [
          '<section><div class="',
          '" style="',
          '">x</div><em class="',
          '">y</em><!--x--></section>'
        ],
        group,
        group,
        group,
        [props.row({ gate })]
      )
    );
    await Promise.resolve();
    clsA = "a2";
    resolveGate("done");
    const chunks = await pending;
    const shell = shellOf(chunks);
    const divMatch = shell.html.match(/<div data-lha="(\d+)" class="a1" style="color:red">/);
    const emMatch = shell.html.match(/<em data-lha="(\d+)" class="c1">/);
    expect(divMatch).toBeTruthy();
    expect(emMatch).toBeTruthy();
    const attrs = chunks.filter(c => c.type === "attr");
    // Only the div changed; the em's rebuild equality-gated.
    expect(attrs).toHaveLength(1);
    expect(attrs[0].key).toBe(divMatch[1]);
    expect(attrs[0].attrs).toBe(' class="a2" style="color:red"');
  });

  it("attr holes: a toggled ssrAttribute ships its removal explicitly", async () => {
    let on = true;
    let resolveGate;
    const gate = new Promise(res => (resolveGate = res));
    const pending = collectStream(props =>
      r.ssr(
        ["<section><button", ">x</button><!--x--></section>"],
        () => r.ssrAttribute("disabled", on),
        [props.row({ gate })]
      )
    );
    await Promise.resolve();
    on = false;
    resolveGate("done");
    const chunks = await pending;
    const shell = shellOf(chunks);
    const [, addr] = shell.html.match(/<button data-lha="(\d+)" disabled>/) || [];
    expect(addr).toBeDefined();
    const attrs = chunks.filter(c => c.type === "attr");
    expect(attrs).toHaveLength(1);
    expect(attrs[0].attrs).toBe("");
    expect(attrs[0].removed).toEqual(["disabled"]);
  });

  it("attr holes: the hostless document fallback injects nothing", async () => {
    // Same degradation as the content-hole case above: without a channel
    // host (no ReadableStream in this environment) the document face
    // latches and its bytes stay untouched. The armed document contract
    // (data-lha inside the barrier) is frame-live-holes-document.spec.js.
    const html = await collectDocument(() =>
      r.ssr(['<div class="', '">x</div>'], () => r.escape("v1", true))
    );
    expect(html).toContain('<div class="v1">x</div>');
    expect(html).not.toContain("data-lha");
  });

  it("client: an attr chunk patches the addressed element in place", async () => {
    const boundary = document.createElement("div");
    document.body.appendChild(boundary);
    const table = createJSONDataTable();
    const host = createFrameHost({
      applyData: c => table.apply(c),
      resolve: ref => table.resolve(ref)
    });
    createFrame(boundary, { host, id: "f", slots: {} });
    try {
      host.apply({
        type: "html",
        id: "f",
        version: 1,
        html: '<div data-lha="0" class="a" disabled="">x</div>'
      });
      const el = boundary.querySelector("div[data-lha]");
      expect(el.className).toBe("a");
      host.apply({
        type: "attr",
        id: "f",
        version: 1,
        key: "0",
        attrs: ' class="b &quot;q&quot;"',
        removed: ["disabled"]
      });
      // Same element, patched in place: class updated (entities decoded),
      // the removed name gone, the address preserved.
      expect(boundary.querySelector("div[data-lha]")).toBe(el);
      expect(el.getAttribute("class")).toBe('b "q"');
      expect(el.hasAttribute("disabled")).toBe(false);
      expect(el.getAttribute("data-lha")).toBe("0");
    } finally {
      boundary.remove();
    }
  });

  it("client: a hole-keyed error stores under the hole's records and warns once", async () => {
    const boundary = document.createElement("div");
    document.body.appendChild(boundary);
    const table = createJSONDataTable();
    const host = createFrameHost({
      applyData: c => table.apply(c),
      resolve: ref => table.resolve(ref)
    });
    createFrame(boundary, { host, id: "f", slots: {} });
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      host.apply({
        type: "html",
        id: "f",
        version: 1,
        html: "<section><!--lh:0-->1<!--lh:/0--></section>"
      });
      expect(boundary.querySelector("section").textContent).toBe("1");
      host.apply({ type: "error", id: "f", version: 1, key: "lh:0", error: "sweep failed" });
      host.apply({ type: "complete", id: "f", version: 1 });
      // The DOM latched — the error did not clear or replace the range.
      expect(boundary.querySelector("section").textContent).toBe("1");
      // One diagnostic naming the hole; re-flushes don't repeat it.
      const holeWarnings = spy.mock.calls.filter(args => String(args[0]).includes("lh:0"));
      expect(holeWarnings).toHaveLength(1);
      expect(String(holeWarnings[0].join(" "))).toContain("sweep failed");
    } finally {
      spy.mockRestore();
      boundary.remove();
    }
  });
});
