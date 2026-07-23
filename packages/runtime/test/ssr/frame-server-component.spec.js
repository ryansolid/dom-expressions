/**
 * @jest-environment jsdom
 */
// The server-component convention, producer half: renderServerComponent
// renders a `props => JSX` function with a slot props proxy — prop
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

describe("renderServerComponent (slot emission)", () => {
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
      "<section><h1>Story</h1><!--slot:children:start--><!--slot:children:end--></section>"
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
      "<div><p>server</p><!--slot:children:start--><button>client</button><!--slot:children:end--></div>"
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
    expect(html).toContain("<!--slot:item#0:start--><!--slot:item#0:end-->");
    expect(html).toContain("<!--slot:item#1:start--><!--slot:item#1:end-->");
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
    await streamInto(
      renderServerComponent(ServerComp(1), { frame: { id: "nav", version: 1 } }),
      host
    );
    // Client-only state the server must never see or reset:
    toggle.checked = true;
    const h1 = boundary.querySelector("h1");
    await streamInto(
      renderServerComponent(ServerComp(2), { frame: { id: "nav", version: 2 } }),
      host
    );
    // Server content morphed in place; the client-owned range and its state
    // survived the navigation.
    expect(boundary.querySelector("h1")).toBe(h1);
    expect(h1.textContent).toBe("Story 2");
    expect(boundary.querySelector("input")).toBe(toggle);
    expect(toggle.checked).toBe(true);
  });

  it("passes server JSX args as nested regions — html once, zero data (dispatch case 1)", async () => {
    const ServerComp = props =>
      r.ssr`<section>${props.comment({
        cid: 1,
        children: r.ssr`<p>unique-text-42</p>`
      })}</section>`;
    const chunks = await renderServerComponent(ServerComp, { frame: { id: "f" } });
    const regions = chunks.filter(c => c.type === "html" && c.id === "f.comment#0.children");
    expect(regions.length).toBe(1);
    expect(regions[0].html).toBe("<p>unique-text-42</p>");
    const slot = chunks.find(c => c.type === "slot");
    expect(slot.args).toEqual({ cid: 1, children: { $frame: "f.comment#0.children" } });
    // The no-double-serialize invariant, literally: the text appears exactly
    // once in the entire payload, and nothing was codec-serialized.
    expect(JSON.stringify(chunks).split("unique-text-42").length).toBe(2);
    expect(chunks.filter(c => c.type === "data")).toEqual([]);
  });

  it("client wraps a nested region without re-rendering it", async () => {
    const ServerComp = props =>
      r.ssr`<div>${props.wrap({ children: r.ssr`<em>server-owned</em>` })}</div>`;
    const host = createFrameHost();
    createFrame(boundary, {
      host,
      id: "w",
      slots: {
        wrap: p => {
          const d = document.createElement("div");
          d.className = "collapse";
          d.appendChild(p.children);
          return d;
        }
      }
    });
    await streamInto(renderServerComponent(ServerComp, { frame: { id: "w" } }), host);
    expect(boundary.querySelector(".collapse em").textContent).toBe("server-owned");
  });

  it("recursive composition threads records through regions; every text ships once", async () => {
    const comments = [
      { id: 1, text: "root-comment", replies: [{ id: 2, text: "nested-reply", replies: [] }] }
    ];
    const ServerComp = props => {
      const renderComment = c =>
        props.comment({
          cid: c.id,
          children: r.ssr`<div class="body"><p>${c.text}</p>${c.replies.map(renderComment)}</div>`
        });
      return r.ssr`<section>${comments.map(renderComment)}</section>`;
    };

    const host = createFrameHost();
    const seen = [];
    createFrame(boundary, {
      host,
      id: "hn",
      slots: {
        comment: p => {
          seen.push(p.cid);
          const wrap = document.createElement("div");
          wrap.className = "comment";
          wrap.dataset.cid = String(p.cid);
          wrap.appendChild(p.children);
          return wrap;
        }
      }
    });
    const chunks = [];
    await streamInto(renderServerComponent(ServerComp, { frame: { id: "hn" } }), host, c =>
      chunks.push(c)
    );

    // Inner occurrences evaluate first (eager JS), so the reply is comment#0.
    expect(seen.sort()).toEqual([1, 2]);
    const outer = boundary.querySelector('.comment[data-cid="1"]');
    const inner = outer.querySelector('.comment[data-cid="2"]');
    expect(outer.querySelector("p").textContent).toBe("root-comment");
    expect(inner.querySelector("p").textContent).toBe("nested-reply");

    // The headline assertion: each comment's text crossed the wire exactly
    // once — html only, no data records at all.
    const payload = JSON.stringify(chunks);
    expect(payload.split("root-comment").length).toBe(2);
    expect(payload.split("nested-reply").length).toBe(2);
    expect(chunks.filter(c => c.type === "data")).toEqual([]);
  });

  it("a primitive `$key` arg names the occurrence (keyed identity)", async () => {
    const ServerComp = props =>
      r.ssr`<ul>${[{ id: "a1" }, { id: "b2" }].map(c =>
        props.comment({ $key: c.id, children: r.ssr`<p>${c.id}</p>` })
      )}</ul>`;
    const chunks = await renderServerComponent(ServerComp, { frame: { id: "k" } });
    expect(chunks.filter(c => c.type === "slot").map(c => c.key)).toEqual([
      "comment#a1",
      "comment#b2"
    ]);
    // The shell chunk specifically — region chunks are html-typed too.
    const html = chunks.find(c => c.type === "html" && c.id === "k").html;
    expect(html).toContain("<!--slot:comment#a1:start-->");
    expect(html).toContain("<!--slot:comment#b2:start-->");
  });

  it("keyed occurrences with equivalent args survive a navigation re-send (no re-call)", async () => {
    const makeComp = title => props =>
      r.ssr`<article><h1>${r.escape(title)}</h1>${props.comment({
        $key: "c1",
        cid: 1,
        children: r.ssr`<p>stable-body</p>`
      })}</article>`;
    const host = createFrameHost();
    let calls = 0;
    createFrame(boundary, {
      host,
      id: "nav",
      slots: {
        comment: p => {
          calls++;
          const wrap = document.createElement("div");
          wrap.className = "comment";
          wrap.appendChild(p.children);
          return wrap;
        }
      }
    });
    await streamInto(
      renderServerComponent(makeComp("One"), { frame: { id: "nav", version: 1 } }),
      host
    );
    const wrap = boundary.querySelector(".comment");
    // Client-only per-comment state:
    wrap.classList.add("collapsed");
    await streamInto(
      renderServerComponent(makeComp("Two"), { frame: { id: "nav", version: 2 } }),
      host
    );
    // Same key + equivalent args ({$frame} region ref included) deduped on
    // the store write: no re-call, same wrapper node, client state intact —
    // while the surrounding server content morphed.
    expect(calls).toBe(1);
    expect(boundary.querySelector("h1").textContent).toBe("Two");
    expect(boundary.querySelector(".comment")).toBe(wrap);
    expect(wrap.classList.contains("collapsed")).toBe(true);
  });

  it("a server-side reorder follows $key: sibling occurrences keep their state", async () => {
    const makeComp = order => props =>
      r.ssr`<section>${order.map(id =>
        props.comment({ $key: id, children: r.ssr`<p>${id}</p>` })
      )}</section>`;
    const host = createFrameHost();
    createFrame(boundary, {
      host,
      id: "ro",
      slots: {
        comment: p => {
          const wrap = document.createElement("div");
          wrap.className = "comment";
          wrap.appendChild(p.children);
          return wrap;
        }
      }
    });
    await streamInto(
      renderServerComponent(makeComp(["a", "b"]), { frame: { id: "ro", version: 1 } }),
      host
    );
    const [wrapA, wrapB] = boundary.querySelectorAll(".comment");
    wrapA.classList.add("collapsed"); // client state on entity "a"
    await streamInto(
      renderServerComponent(makeComp(["b", "a"]), { frame: { id: "ro", version: 2 } }),
      host
    );
    const after = [...boundary.querySelectorAll(".comment")];
    // Entity "a" moved to second position — same node, state intact.
    expect(after[0]).toBe(wrapB);
    expect(after[1]).toBe(wrapA);
    expect(after[1].classList.contains("collapsed")).toBe(true);
    expect(after[1].textContent).toBe("a");
  });

  it("documented limitation: a server element wrapping each occurrence defeats reorder identity", async () => {
    // Keyed occurrences must be SIBLINGS for reorder to follow $key — ranges
    // relocate within one parent only. Wrapping each call site in its own
    // server element puts ranges in different parents: content still
    // converges, but client state does not follow the entity. Let the CLIENT
    // own the per-item wrapper instead (the slot callback returns it).
    const makeComp = order => props =>
      r.ssr`<section>${order.map(
        id => r.ssr`<div class="row">${props.comment({ $key: id, label: id })}</div>`
      )}</section>`;
    const host = createFrameHost();
    createFrame(boundary, {
      host,
      id: "wl",
      slots: {
        comment: p => {
          const b = document.createElement("b");
          b.textContent = p.label;
          return b;
        }
      }
    });
    await streamInto(
      renderServerComponent(makeComp(["a", "b"]), { frame: { id: "wl", version: 1 } }),
      host
    );
    const first = boundary.querySelectorAll("b")[0];
    first.dataset.mine = "yes";
    await streamInto(
      renderServerComponent(makeComp(["b", "a"]), { frame: { id: "wl", version: 2 } }),
      host
    );
    // Content converges…
    expect([...boundary.querySelectorAll("b")].map(b => b.textContent)).toEqual(["b", "a"]);
    // …but entity "a"'s node did not travel: its state is gone.
    const aNode = [...boundary.querySelectorAll("b")].find(b => b.textContent === "a");
    expect(aNode.dataset.mine).toBeUndefined();
  });

  it("a changed primitive arg on the same key re-calls the occurrence", async () => {
    const makeComp = score => props =>
      r.ssr`<div>${props.comment({ $key: "c1", score, children: r.ssr`<p>body</p>` })}</div>`;
    const host = createFrameHost();
    const seen = [];
    createFrame(boundary, {
      host,
      id: "up",
      slots: {
        comment: p => {
          seen.push(p.score);
          const b = document.createElement("b");
          b.appendChild(p.children);
          return b;
        }
      }
    });
    await streamInto(renderServerComponent(makeComp(1), { frame: { id: "up", version: 1 } }), host);
    await streamInto(renderServerComponent(makeComp(2), { frame: { id: "up", version: 2 } }), host);
    expect(seen).toEqual([1, 2]);
  });

  it("a synchronous render failure travels as a structured error chunk", async () => {
    const chunks = await renderServerComponent(
      () => {
        throw new Error("boom in render");
      },
      { frame: { id: "err" } }
    );
    const error = chunks.find(c => c.type === "error");
    expect(error.error).toContain("boom in render");
    expect(chunks[chunks.length - 1].type).toBe("complete");
    // The consumer stores it and exposes it, instead of a truncated stream.
    const host = createFrameHost();
    const frame = createFrame(boundary, { host, id: "err" });
    for (const c of chunks) host.apply(c);
    expect(frame.error).toContain("boom in render");
  });

  it("module assets preload as soon as their record lands", async () => {
    const frame = createFrame(boundary);
    frame.apply({
      version: 1,
      r: {
        "seg:p1:assets": { type: "assets", key: "p1", modules: ["/lazy-widget.js"] }
      }
    });
    const links = [...document.head.querySelectorAll('link[rel="modulepreload"]')].filter(
      l => l.getAttribute("href") === "/lazy-widget.js"
    );
    expect(links.length).toBe(1);
    // Re-applying dedupes.
    frame.apply({
      version: 1,
      r: {
        "seg:p2:assets": { type: "assets", key: "p2", modules: ["/lazy-widget.js"] }
      }
    });
    expect(
      [...document.head.querySelectorAll('link[rel="modulepreload"]')].filter(
        l => l.getAttribute("href") === "/lazy-widget.js"
      ).length
    ).toBe(1);
    links[0].remove();
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
      "<div><p>late</p><!--slot:footer:start--><em>foot</em><!--slot:footer:end--></div>"
    );
  });
});

describe("document-mode inline rendering (t=0)", () => {
  it("wraps a direct function result with boundary/proj/region markers, client content inline, once", done => {
    const { frameTransformDirectResult } = require("../../src/frame-sink");
    // What the server function returned in-process during document SSR.
    const serverComponent = props =>
      r.ssr`<article><h1>One</h1><section>${[
        props.comment({
          $key: "c1",
          cid: "c1",
          children: r.ssr`<p>alpha-text</p>`
        })
      ]}</section><footer>${props.children()}</footer></article>`;

    const Inline = frameTransformDirectResult(serverComponent, { id: "hn/story-0" });
    // The client's REAL props render server-side at t=0 (the one exception).
    const clientProps = {
      comment: p => r.ssr`<div class="comment"><button>[-]</button>${p.children}</div>`,
      children: r.ssr`<input class="draft">`
    };

    const chunks = [];
    r.renderToStream(() => Inline(clientProps)).pipe({
      write: c => chunks.push(c),
      end: () => {
        const html = chunks.join("");
        // Boundary is an ELEMENT; occurrence + region are still markers.
        expect(html).toContain('<dx-frame data-fid="hn/story-0" style="display:contents">');
        expect(html).toContain("<!--slot:comment#c1:start-->");
        expect(html).toContain("<!--frame:hn/story-0.comment#c1.children:start-->");
        expect(html).toContain("<!--slot:children:start-->");
        // Client wrapper rendered INSIDE its occurrence range, server body
        // INSIDE the nested region, draft inside the direct-insert range.
        expect(html).toMatch(
          /<!--slot:comment#c1:start--><div class="comment"><button>\[-\]<\/button><!--frame:hn\/story-0\.comment#c1\.children:start--><p>alpha-text<\/p><!--frame:hn\/story-0\.comment#c1\.children:end--><\/div><!--slot:comment#c1:end-->/
        );
        // The single-occurrence invariant on the page itself.
        expect(html.split("alpha-text").length).toBe(2);
        expect(html).not.toContain('"alpha-text"');
        done();
      }
    });
  });

  it("server-owned elements carry no hydration keys; client wrappers keep sc- keys (NoHydration/Hydration zones)", done => {
    const { frameTransformDirectResult } = require("../../src/frame-sink");
    // Compiled-shape output: ssrElement with needsId emits `_hk` when keys
    // flow. Server-owned content renders in a NoHydration zone (keys are
    // pure tax on adopted markup — "hydration:false regions"); the client
    // wrapper re-enters via Hydration under its sc- occurrence namespace.
    const serverComponent = props =>
      r.ssrElement(
        "article",
        null,
        [
          r.ssrElement("h1", null, "One", true),
          props.comment({
            $key: "c1",
            cid: "c1",
            children: r.ssrElement("p", null, "alpha", true)
          })
        ],
        true
      );
    const Inline = frameTransformDirectResult(serverComponent, { id: "hn/story-0" });
    const clientProps = {
      comment: p => r.ssrElement("div", { class: "comment" }, [p.children], true)
    };
    const chunks = [];
    r.renderToStream(() => Inline(clientProps)).pipe({
      write: c => chunks.push(c),
      end: () => {
        const html = chunks.join("");
        // ssrElement leaves the empty key slot's space behind — the point
        // is the ABSENCE of `_hk` on every server-owned element.
        expect(html).toContain("<article >");
        expect(html).toContain("<h1 >One</h1>");
        expect(html).toContain("<p >alpha</p>");
        // Exactly one key in the whole boundary: the wrapper root, in its
        // occurrence namespace.
        const keys = html.match(/ _hk=[^ >]+/g) || [];
        expect(keys).toHaveLength(1);
        expect(keys[0]).toContain("_hk=sc-hn/story-0-comment#c1-");
        done();
      }
    });
  });
});

describe("server-component hydration reference", () => {
  it("serializes an inline server component as a stable placeholder reference", done => {
    const {
      frameTransformDirectResult,
      ServerComponentPlugin,
      SERVER_COMPONENT_BOOTSTRAP
    } = require("../../src/frame-sink");
    const { createHydrationSerializer } = require("../../src/serializer");

    const Inline = frameTransformDirectResult(() => r.ssr`<b>x</b>`, { id: "hn/story-0" });
    const scripts = [];
    const serializer = createHydrationSerializer({
      plugins: [ServerComponentPlugin],
      onData: s => scripts.push(s),
      onDone: () => {
        const payload = scripts.join(";");
        // The reference, not the function: resolution is invocation-time
        // through the bootstrap's memoized placeholder.
        expect(payload).toContain('self._$SC.r("hn/story-0")');
        expect(payload).not.toContain("createDocumentSlotProps");
        // The bootstrap evaluates and memoizes stable identities.
        // eslint-disable-next-line no-eval
        (0, eval)(SERVER_COMPONENT_BOOTSTRAP);
        const first = globalThis._$SC.r("hn/story-0");
        expect(typeof first).toBe("function");
        expect(globalThis._$SC.r("hn/story-0")).toBe(first);
        // The placeholder delegates to the installed implementation.
        globalThis._$SC.impl = (id, props) => `${id}:${props.x}`;
        expect(first({ x: 1 })).toBe("hn/story-0:1");
        delete globalThis._$SC;
        done();
      }
    });
    serializer.write("0", Inline);
    serializer.flush();
  });
});

describe("document-mode occlusion flip (case 3)", () => {
  it("a region the wrapper never renders ships once — as records, not markup", done => {
    const { frameTransformDirectResult, ServerComponentPlugin } = require("../../src/frame-sink");
    const serverComponent = props =>
      r.ssr`<article>${[
        props.comment({ $key: "c1", cid: "c1", children: r.ssr`<p>occluded-text</p>` }),
        // `title` duplicates rendered content — it must be EXCLUDED from the
        // t=0 record (recoverable from the page; re-sending would break the
        // single-copy invariant). `cid` is not rendered anywhere: it ships.
        props.comment({
          $key: "c2",
          cid: "c2",
          title: "visible-text",
          children: r.ssr`<p>visible-text</p>`
        })
      ]}</article>`;
    const Inline = frameTransformDirectResult(serverComponent, { id: "occ-0" });
    // The client wrapper renders c2's children but SKIPS c1's (collapsed by
    // default) — evaluation is the usage signal.
    const clientProps = {
      comment: p =>
        p.cid === "c1"
          ? r.ssr`<div class="comment collapsed"><button>[+]</button></div>`
          : r.ssr`<div class="comment"><button>[-]</button>${p.children}</div>`
    };
    const chunks = [];
    r.renderToStream(() => Inline(clientProps), { plugins: [ServerComponentPlugin] }).pipe({
      write: c => chunks.push(c),
      end: () => {
        const html = chunks.join("");
        // The occluded text is NOT in the markup — and appears exactly once
        // overall, inside the serialized region record.
        expect(html.split("occluded-text").length).toBe(2);
        expect(html).toContain('"sc:region:occ-0.comment#c1.children"');
        expect(html).toContain('"sc:slot:occ-0:comment#c1"');
        // The record carries the region REF for the occluded arg + the
        // primitive.
        expect(html).toContain('$frame:"occ-0.comment#c1.children"');
        // Rendered occurrences also re-arm at t=0 — but ONLY with values not
        // recoverable from the page: `cid` ships, `title` (rendered into the
        // content) is excluded, so nothing appears twice.
        expect(html).toContain('"sc:slot:occ-0:comment#c2"');
        expect(html).toContain('cid:"c2"');
        expect(html).not.toContain("title:");
        // The visible region renders inline as markup, once.
        expect(html.split("visible-text").length).toBe(2);
        expect(html).toContain("frame:occ-0.comment#c2.children:start");
        done();
      }
    });
  });
});

describe("document-mode t=0 arming vs hydration keys (#547)", () => {
  it("a cid equal to $key still arms its record — _hk attributes are not recoverable content", done => {
    const { frameTransformDirectResult, ServerComponentPlugin } = require("../../src/frame-sink");
    const serverComponent = props =>
      r.ssr`<article>${[
        props.comment({ $key: "c1", cid: "c1", children: r.ssr`<p>body-text</p>` })
      ]}</article>`;
    const Inline = frameTransformDirectResult(serverComponent, { id: "hk-0" });
    // Compiled-shape wrapper: the root element takes a hydration key, and
    // that key EMBEDS the occurrence id ($key) — before the fix, the
    // recoverability check matched cid against its own wrapper's _hk and
    // never shipped the record, so adopted occurrences mounted un-armed.
    const clientProps = {
      comment: p => r.ssrElement("div", { class: "comment" }, [p.children], true)
    };
    const chunks = [];
    r.renderToStream(() => Inline(clientProps), { plugins: [ServerComponentPlugin] }).pipe({
      write: c => chunks.push(c),
      end: () => {
        const html = chunks.join("");
        expect(html).toContain("_hk=sc-hk-0-comment#c1-");
        expect(html).toContain('"sc:slot:hk-0:comment#c1"');
        expect(html).toContain('cid:"c1"');
        // Element TEXT still counts as recoverable: body-text renders, so
        // it must not be re-shipped anywhere as data.
        expect(html.split("body-text").length).toBe(2);
        done();
      }
    });
  });
});

describe("document-mode occlusion flip — async region content", () => {
  it("an occluded region with pending async content still ships once, patched when it settles", done => {
    const { frameTransformDirectResult, ServerComponentPlugin } = require("../../src/frame-sink");
    const wait = ms => new Promise(res => setTimeout(res, ms));
    // Server content whose html resolves asynchronously (a hole that lands
    // after the wrapper's render has already occluded it).
    const AsyncBody = () => {
      const p = wait(15).then(() => r.ssr`<p>late-occluded-text</p>`);
      let settled, value;
      p.then(v => ((settled = true), (value = v)));
      return r.ssr`<div class="body">${() => {
        if (!settled) {
          const err = new Error("pending");
          err._promise = p; // the test core's ssrHandleError escalation hook
          throw err;
        }
        return value;
      }}</div>`;
    };
    const serverComponent = props =>
      r.ssr`<article>${[props.comment({ $key: "c1", children: AsyncBody() })]}</article>`;
    const Inline = frameTransformDirectResult(serverComponent, { id: "aocc-0" });
    const clientProps = {
      comment: () => r.ssr`<div class="comment collapsed"><button>[+]</button></div>`
    };
    const chunks = [];
    r.renderToStream(() => Inline(clientProps), { plugins: [ServerComponentPlugin] }).pipe({
      write: c => chunks.push(c),
      end: () => {
        const html = chunks.join("");
        expect(html.split("late-occluded-text").length).toBe(2);
        expect(html).toContain('"sc:region:aocc-0.comment#c1.children"');
        done();
      }
    });
  });
});
