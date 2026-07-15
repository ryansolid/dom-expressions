/**
 * @jest-environment jsdom
 */
// The frame-streams spike's 60-test corpus, ported to the dom-expressions
// frame client. Adaptations from the spike (see frame-client.js header):
//  - fragment placeholders use the document range vocabulary
//    `<template id="pl-KEY"></template><!--pl-KEY-->`; reveal clears the range
//    interior, inserts the content, and removes both markers.
//  - `data` chunks are response-scoped payloads applied through the host's
//    `applyData` hook — they never land in a frame's store.
//  - the host takes `{ serialize, resolve, applyData }` instead of a
//    serializer object.
import { createFrame, createFrameHost, chunkToRecords } from "../../src/frame-client";

// Mock serializer — response-scoped key/value with referential dedupe (the
// essentials of the spike's serializer.ts). `serialize` records a value
// (deduped by identity) and hands back a `{$ref}`; `resolve` returns the same
// instance, which is what preserves identity across the "transport".
function createMockSerializer(prefix = "data") {
  const keyByValue = new Map();
  const valueByKey = new Map();
  let next = 0;
  return {
    serialize(value) {
      let key = keyByValue.get(value);
      if (key === undefined) {
        key = `${prefix}:${next++}`;
        keyByValue.set(value, key);
        valueByKey.set(key, value);
      }
      return { $ref: key };
    },
    resolve(ref) {
      return valueByKey.get(ref.$ref);
    }
  };
}

/** The fragment placeholder range for a segment: template start + comment close. */
const ph = name => `<template id="pl-${name}"></template><!--pl-${name}-->`;

let boundary;

beforeEach(() => {
  document.body.innerHTML = "";
  boundary = document.createElement("div");
  document.body.appendChild(boundary);
});

const html = value => ({ kind: "html", value });

describe("root apply", () => {
  it("materializes root HTML into the boundary", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html("<section>Hello</section>") } });

    expect(boundary.innerHTML).toBe("<section>Hello</section>");
    expect(frame.version).toBe(1);
  });

  it("merges partial writes for the same version", () => {
    const data = [];
    const host = createFrameHost({
      ...createMockSerializer(),
      applyData: c => data.push(c)
    });
    const frame = createFrame(boundary, { id: "f", host });
    host.apply({ type: "html", id: "f", version: 1, html: `<section>${ph("p1")}</section>` });
    host.apply({ type: "data", id: "f", version: 1, key: "x", node: { t: 1 }, initial: true });

    // The root write lands in the resident store; the data record is
    // response-scoped and goes through the host's data hook (whole chunk),
    // not the store.
    expect(frame.store[""]).toBeDefined();
    expect(data.length).toBe(1);
    expect(data[0].key).toBe("x");
    expect(frame.store["data:user"]).toBeUndefined();
  });
});

describe("versioning", () => {
  it("discards stale-version writes (late fragment after a newer start)", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html("<p>old</p>") } });
    frame.apply({ version: 2, r: { "": html("<p>current</p>") } });

    // Late write for the dead version 1 has no live store to land in.
    frame.apply({
      version: 1,
      r: { "seg:late": html("<span>Old</span>"), "seg:late:reveal": true }
    });

    expect(frame.version).toBe(2);
    expect(frame.store["seg:late"]).toBeUndefined();
    expect(boundary.textContent).toBe("current");
  });

  it("drops a pending old segment when a new version replaces the frame", () => {
    const frame = createFrame(boundary);
    // v1: placeholder + content present, but reveal never arrives (pending).
    frame.apply({
      version: 1,
      r: {
        "": html(`<section>${ph("p1")}</section>`),
        "seg:p1": html("<p>Loaded</p>")
      }
    });
    expect(frame.isRevealed("p1")).toBe(false);

    // v2: fresh frame without that placeholder.
    frame.apply({ version: 2, r: { "": html("<section>v2</section>") } });
    // A late v1 reveal must be ignored.
    frame.apply({ version: 1, r: { "seg:p1:reveal": true } });

    expect(frame.isRevealed("p1")).toBe(false);
    expect(boundary.innerHTML).toBe("<section>v2</section>");
  });
});

describe("version bump preserves client state (policy A)", () => {
  it("keeps a client slot and its state across a version bump that updates server content", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, {
      id: "f",
      host,
      slots: {
        panel: props => {
          const input = document.createElement("input");
          input.value = props.value ?? "";
          return input;
        }
      }
    });

    const range = "<!--proj:panel#0:start--><!--proj:panel#0:end-->";
    host.apply({
      type: "slot",
      id: "f",
      version: 1,
      key: "panel#0",
      args: { value: host.serialize("initial") }
    });
    host.apply({ type: "html", id: "f", version: 1, html: `<div><h1>v1</h1>${range}</div>` });

    const input = boundary.querySelector("input");
    // Client-only state that exists in no chunk: the user types into the input.
    input.value = "user typed";

    // Navigation = a new version with updated server content. The panel's args
    // are unchanged, so the server does not re-send its slot chunk.
    host.apply({ type: "html", id: "f", version: 2, html: `<div><h1>v2</h1>${range}</div>` });

    // Server content updated, but the client slot node and its state survive.
    expect(boundary.querySelector("h1").textContent).toBe("v2");
    expect(boundary.querySelector("input")).toBe(input);
    expect(input.value).toBe("user typed");
  });
});

describe("segment reveal readiness", () => {
  it("reveals when content arrives, then reveal (content -> reveal)", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(`<section>${ph("p1")}</section>`) } });
    frame.apply({ version: 1, r: { "seg:p1": html("<p>Loaded</p>") } });

    // Content present, but no reveal gate yet: buffered.
    expect(frame.isRevealed("p1")).toBe(false);
    expect(boundary.innerHTML).toContain(ph("p1"));

    frame.apply({ version: 1, r: { "seg:p1:reveal": true } });
    expect(frame.isRevealed("p1")).toBe(true);
    expect(boundary.innerHTML).toBe("<section><p>Loaded</p></section>");
  });

  it("reveals when reveal arrives before content (reveal -> content)", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(`<section>${ph("p1")}</section>`) } });
    frame.apply({ version: 1, r: { "seg:p1:reveal": true } });

    // Reveal present, but content missing: buffered.
    expect(frame.isRevealed("p1")).toBe(false);

    frame.apply({ version: 1, r: { "seg:p1": html("<p>Loaded</p>") } });
    expect(frame.isRevealed("p1")).toBe(true);
    expect(boundary.innerHTML).toBe("<section><p>Loaded</p></section>");
  });

  it("buffers a segment that arrives before its root placeholder", () => {
    const frame = createFrame(boundary);
    // Segment content + reveal arrive first; no placeholder exists yet.
    frame.apply({
      version: 1,
      r: { "seg:p1": html("<p>Loaded</p>"), "seg:p1:reveal": true }
    });
    expect(frame.isRevealed("p1")).toBe(false);

    // Root with the placeholder lands last -> reveal fires on that flush.
    frame.apply({ version: 1, r: { "": html(`<section>${ph("p1")}</section>`) } });
    expect(frame.isRevealed("p1")).toBe(true);
    expect(boundary.innerHTML).toBe("<section><p>Loaded</p></section>");
  });

  it("reveals multiple segments independently", () => {
    const frame = createFrame(boundary);
    frame.apply({
      version: 1,
      r: { "": html(`<section>${ph("p1")}${ph("p2")}</section>`) }
    });

    frame.apply({ version: 1, r: { "seg:p1": html("<p>one</p>"), "seg:p1:reveal": true } });
    expect(frame.isRevealed("p1")).toBe(true);
    expect(frame.isRevealed("p2")).toBe(false);
    expect(boundary.innerHTML).toBe(`<section><p>one</p>${ph("p2")}</section>`);

    frame.apply({ version: 1, r: { "seg:p2": html("<p>two</p>"), "seg:p2:reveal": true } });
    expect(frame.isRevealed("p2")).toBe(true);
    expect(boundary.innerHTML).toBe("<section><p>one</p><p>two</p></section>");
  });

  // The store-model analogue of the document runtime's $dfd retry drain
  // (upstream 9d5a90ba): a reveal can insert another segment's placeholder
  // into the DOM, so readiness must re-evaluate until a pass makes no
  // progress — regardless of arrival/iteration order.
  it("reveals a segment whose placeholder arrives inside another segment's content", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(`<div>${ph("outer")}</div>`) } });
    // Inner lands first: its placeholder is inside outer's unrevealed content,
    // so it is structurally not ready when first evaluated.
    frame.apply({ version: 1, r: { "seg:inner": html("<em>I</em>"), "seg:inner:reveal": true } });
    expect(frame.isRevealed("inner")).toBe(false);
    // Outer's reveal brings inner's placeholder into the DOM in the same
    // flush; inner must reveal without any further chunk arriving.
    frame.apply({
      version: 1,
      r: { "seg:outer": html(`<section>${ph("inner")}</section>`), "seg:outer:reveal": true }
    });
    expect(frame.isRevealed("outer")).toBe(true);
    expect(frame.isRevealed("inner")).toBe(true);
    expect(boundary.innerHTML).toBe("<div><section><em>I</em></section></div>");
  });

  it("materializes a fallback whose placeholder arrives inside revealed content", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(`<div>${ph("outer")}</div>`) } });
    // The inner fallback gate lands before the placeholder exists anywhere.
    frame.apply({ version: 1, r: { "seg:inner:fallback": true } });
    frame.apply({
      version: 1,
      r: {
        "seg:outer": html(
          `<section><template id="pl-inner"><em>waiting</em></template><!--pl-inner--></section>`
        ),
        "seg:outer:reveal": true
      }
    });
    expect(boundary.innerHTML).toBe(
      `<div><section><template id="pl-inner"><em>waiting</em></template><em>waiting</em><!--pl-inner--></section></div>`
    );
  });

  it("gates a reveal on its stylesheet loading, inserting the link eagerly", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(`<div>${ph("p1")}</div>`) } });
    frame.apply({
      version: 1,
      r: {
        "seg:p1": html("<p>styled</p>"),
        "seg:p1:assets": { type: "assets", key: "p1", styles: ["/p1.css"] },
        "seg:p1:reveal": true
      }
    });
    // The link is inserted immediately so loading overlaps the stream, but
    // the reveal waits for it to settle.
    const link = [...document.head.querySelectorAll("link")].find(
      l => l.getAttribute("href") === "/p1.css"
    );
    expect(link).toBeTruthy();
    expect(frame.isRevealed("p1")).toBe(false);
    link.dispatchEvent(new Event("load"));
    expect(frame.isRevealed("p1")).toBe(true);
    expect(boundary.innerHTML).toBe("<div><p>styled</p></div>");
    link.remove();
  });

  it("a stylesheet error unblocks the reveal (same policy as $dfc onerror)", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(`<div>${ph("p1")}</div>`) } });
    frame.apply({
      version: 1,
      r: {
        "seg:p1": html("<p>anyway</p>"),
        "seg:p1:assets": { type: "assets", key: "p1", styles: ["/broken.css"] },
        "seg:p1:reveal": true
      }
    });
    const link = [...document.head.querySelectorAll("link")].find(
      l => l.getAttribute("href") === "/broken.css"
    );
    expect(frame.isRevealed("p1")).toBe(false);
    link.dispatchEvent(new Event("error"));
    expect(frame.isRevealed("p1")).toBe(true);
    link.remove();
  });

  it("treats a stylesheet already in the document as loaded", () => {
    const existing = document.createElement("link");
    existing.rel = "stylesheet";
    existing.href = "/already.css";
    document.head.appendChild(existing);
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(`<div>${ph("p1")}</div>`) } });
    frame.apply({
      version: 1,
      r: {
        "seg:p1": html("<p>ok</p>"),
        "seg:p1:assets": { type: "assets", key: "p1", styles: ["/already.css"] },
        "seg:p1:reveal": true
      }
    });
    expect(frame.isRevealed("p1")).toBe(true);
    existing.remove();
  });

  it("applies inline styles to the head on reveal, deduped by data-asset id", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(`<div>${ph("p1")}${ph("p2")}</div>`) } });
    const inline = [{ id: "css-a", content: ".a{color:red}" }];
    frame.apply({
      version: 1,
      r: {
        "seg:p1": html("<p>one</p>"),
        "seg:p1:assets": { type: "assets", key: "p1", inlineStyles: inline },
        "seg:p1:reveal": true,
        "seg:p2": html("<p>two</p>"),
        "seg:p2:assets": { type: "assets", key: "p2", inlineStyles: inline },
        "seg:p2:reveal": true
      }
    });
    expect(frame.isRevealed("p1")).toBe(true);
    expect(frame.isRevealed("p2")).toBe(true);
    const styles = [...document.head.querySelectorAll("style")].filter(
      s => s.getAttribute("data-asset") === "css-a"
    );
    expect(styles.length).toBe(1);
    expect(styles[0].textContent).toBe(".a{color:red}");
    styles[0].remove();
  });

  it("does not double-apply a reveal on re-flush", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(`<section>${ph("p1")}</section>`) } });
    frame.apply({ version: 1, r: { "seg:p1": html("<p>Loaded</p>"), "seg:p1:reveal": true } });
    // A subsequent unrelated write triggers another flush.
    frame.apply({ version: 1, r: { "misc:x": true } });

    expect(boundary.innerHTML).toBe("<section><p>Loaded</p></section>");
  });
});

describe("morph", () => {
  // Morph is exercised by applying a second, differing root value.
  const withContent = initial => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(initial) } });
    return frame;
  };

  it("updates text and attributes in place, preserving node identity", () => {
    const frame = withContent('<div class="a">Hello</div>');
    const div = boundary.firstElementChild;
    const text = div.firstChild;

    frame.apply({ version: 2, r: { "": html('<div class="b">Goodbye</div>') } });

    expect(boundary.firstElementChild).toBe(div); // element reused
    expect(div.firstChild).toBe(text); // text node reused
    expect(div.getAttribute("class")).toBe("b");
    expect(div.textContent).toBe("Goodbye");
  });

  it("inserts and removes children without recreating siblings", () => {
    const frame = withContent("<ul><li>a</li></ul>");
    const ul = boundary.firstElementChild;
    const liA = ul.firstElementChild;

    frame.apply({ version: 2, r: { "": html("<ul><li>a</li><li>b</li></ul>") } });
    expect(ul.firstElementChild).toBe(liA); // existing item preserved
    expect(ul.children.length).toBe(2);
    expect(ul.textContent).toBe("ab");

    frame.apply({ version: 3, r: { "": html("<ul><li>a</li></ul>") } });
    expect(ul.firstElementChild).toBe(liA);
    expect(ul.children.length).toBe(1);
  });

  it("preserves a segment marker across a morph, then still reveals it", () => {
    const frame = withContent(`<section>x${ph("p1")}</section>`);
    const section = boundary.firstElementChild;

    frame.apply({ version: 2, r: { "": html(`<section>y${ph("p1")}</section>`) } });
    expect(section.textContent).toBe("y");
    // Both range markers survive the morph.
    expect(boundary.innerHTML).toContain(ph("p1"));

    frame.apply({ version: 2, r: { "seg:p1": html("<p>Loaded</p>"), "seg:p1:reveal": true } });
    expect(frame.isRevealed("p1")).toBe(true);
    // Reveal replaces the range with the content and removes both markers.
    expect(boundary.innerHTML).toBe("<section>y<p>Loaded</p></section>");
  });

  it("preserves a protected projection range and its client-owned interior", () => {
    const frame = withContent("<div><!--proj:0:start--><!--proj:0:end--></div>");
    const div = boundary.firstElementChild;

    // Simulate client code mounting owned content inside the projection range.
    const start = Array.from(div.childNodes).find(
      n => n.nodeType === 8 && n.data === "proj:0:start"
    );
    const clientSpan = document.createElement("span");
    clientSpan.textContent = "client";
    start.after(clientSpan);
    expect(div.innerHTML).toBe("<!--proj:0:start--><span>client</span><!--proj:0:end-->");

    // Server-owned surroundings change; the projection interior must survive.
    frame.apply({
      version: 2,
      r: { "": html("<div>prefix<!--proj:0:start--><!--proj:0:end-->suffix</div>") }
    });

    expect(boundary.firstElementChild).toBe(div);
    // The exact same client node instance is preserved (not recreated).
    expect(div.contains(clientSpan)).toBe(true);
    expect(clientSpan.parentNode).toBe(div);
    expect(div.innerHTML).toBe(
      "prefix<!--proj:0:start--><span>client</span><!--proj:0:end-->suffix"
    );
  });

  it("does not diff inside a projection range even when server sends interior", () => {
    const frame = withContent("<div><!--proj:0:start--><!--proj:0:end--></div>");
    const div = boundary.firstElementChild;
    const start = Array.from(div.childNodes).find(
      n => n.nodeType === 8 && n.data === "proj:0:start"
    );
    const clientSpan = document.createElement("span");
    clientSpan.textContent = "client-owned";
    start.after(clientSpan);

    // Server resends the projection with placeholder interior; client wins.
    frame.apply({
      version: 2,
      r: { "": html("<div><!--proj:0:start--><em>server</em><!--proj:0:end--></div>") }
    });

    expect(div.contains(clientSpan)).toBe(true);
    expect(div.querySelector("em")).toBeNull();
    expect(div.textContent).toBe("client-owned");
  });
});

describe("client-anchor invariant", () => {
  // Focus/selection/media survive a server update only if the client-owned node
  // is never detached. DOM-shim focus semantics are unreliable, so we assert
  // the structural guarantee that produces focus preservation in a real browser:
  // the client node keeps its identity and connectedness through server churn.
  const findComment = (root, data) => {
    const walker = document.createTreeWalker(root, 128 /* SHOW_COMMENT */);
    let n;
    while ((n = walker.nextNode())) if (n.data === data) return n;
    throw new Error(`comment not found: ${data}`);
  };

  it("never detaches a client-owned node when server DOM churns around it", () => {
    const frame = createFrame(boundary);
    frame.apply({
      version: 1,
      r: { "": html("<div><p>a</p><!--proj:0:start--><!--proj:0:end--><p>b</p></div>") }
    });
    const div = boundary.firstElementChild;
    const clientNode = document.createElement("input");
    clientNode.value = "typed";
    findComment(div, "proj:0:start").after(clientNode);
    expect(clientNode.isConnected).toBe(true);

    // Server churn: change both <p> texts and insert a new server sibling before
    // the projection range.
    frame.apply({
      version: 2,
      r: {
        "": html("<div><p>A</p><span>new</span><!--proj:0:start--><!--proj:0:end--><p>B</p></div>")
      }
    });

    // The exact client node instance is preserved, still connected, value intact.
    expect(clientNode.isConnected).toBe(true);
    expect(div.contains(clientNode)).toBe(true);
    expect(clientNode.value).toBe("typed");
    // Still bracketed by its projection markers.
    expect(clientNode.previousSibling.data).toBe("proj:0:start");
    expect(clientNode.nextSibling.data).toBe("proj:0:end");
    expect(div.innerHTML).toBe(
      "<p>A</p><span>new</span><!--proj:0:start--><input><!--proj:0:end--><p>B</p>"
    );
  });

  it("preserves each range's client interior by id across a reorder", () => {
    const frame = createFrame(boundary);
    frame.apply({
      version: 1,
      r: {
        "": html(
          "<div><!--proj:0:start--><!--proj:0:end--><!--proj:1:start--><!--proj:1:end--></div>"
        )
      }
    });
    const div = boundary.firstElementChild;
    const a = document.createElement("span");
    a.textContent = "A";
    const b = document.createElement("span");
    b.textContent = "B";
    findComment(div, "proj:0:start").after(a);
    findComment(div, "proj:1:start").after(b);

    // Server reorders the two ranges. State follows the id, not the position.
    // (This path uses ordinary insertBefore, so a real browser would lose focus
    // here without moveBefore; identity and structure are still correct.)
    frame.apply({
      version: 2,
      r: {
        "": html(
          "<div><!--proj:1:start--><!--proj:1:end--><!--proj:0:start--><!--proj:0:end--></div>"
        )
      }
    });

    expect(div.contains(a)).toBe(true);
    expect(div.contains(b)).toBe(true);
    // A stays inside range 0, B inside range 1, and the ranges swapped order.
    expect(a.previousSibling.data).toBe("proj:0:start");
    expect(b.previousSibling.data).toBe("proj:1:start");
    expect(div.innerHTML).toBe(
      "<!--proj:1:start--><span>B</span><!--proj:1:end--><!--proj:0:start--><span>A</span><!--proj:0:end-->"
    );
  });
});

describe("client slots", () => {
  it("fills a server-declared slot with client content", () => {
    const clientNode = document.createElement("button");
    clientNode.textContent = "client";
    const frame = createFrame(boundary, { slots: { 0: () => clientNode } });
    frame.apply({
      version: 1,
      r: { "": html("<div>server<!--proj:0:start--><!--proj:0:end--></div>") }
    });

    expect(boundary.innerHTML).toBe(
      "<div>server<!--proj:0:start--><button>client</button><!--proj:0:end--></div>"
    );
    expect(clientNode.isConnected).toBe(true);
  });

  it("mounts each slot once and preserves it across server template updates", () => {
    let calls = 0;
    const clientNode = document.createElement("input");
    clientNode.value = "typed";
    const frame = createFrame(boundary, {
      slots: {
        0: () => {
          calls++;
          return clientNode;
        }
      }
    });
    frame.apply({
      version: 1,
      r: { "": html("<div><h1>A</h1><!--proj:0:start--><!--proj:0:end--></div>") }
    });
    frame.apply({
      version: 2,
      r: { "": html("<div><h1>B</h1><!--proj:0:start--><!--proj:0:end--></div>") }
    });

    expect(calls).toBe(1);
    expect(boundary.querySelector("h1").textContent).toBe("B");
    expect(clientNode.isConnected).toBe(true);
    expect(clientNode.value).toBe("typed");
  });

  it("mounts a slot that only appears in a later template version", () => {
    let calls = 0;
    const frame = createFrame(boundary, {
      slots: {
        0: () => {
          calls++;
          const span = document.createElement("span");
          span.textContent = "c";
          return span;
        }
      }
    });
    frame.apply({ version: 1, r: { "": html("<div>no slot yet</div>") } });
    expect(calls).toBe(0);

    frame.apply({
      version: 2,
      r: { "": html("<div><!--proj:0:start--><!--proj:0:end--></div>") }
    });
    expect(calls).toBe(1);
    expect(boundary.textContent).toBe("c");
  });

  it("composes recursively: server template -> client slot -> nested server frame", () => {
    const replyButton = document.createElement("button");
    replyButton.textContent = "reply";
    const innerHost = document.createElement("div");
    const inner = createFrame(innerHost, { slots: { reply: () => replyButton } });

    const outer = createFrame(boundary, {
      slots: {
        children: () => {
          inner.apply({
            version: 1,
            r: {
              "": html("<section>Comment<!--proj:reply:start--><!--proj:reply:end--></section>")
            }
          });
          return innerHost;
        }
      }
    });
    outer.apply({
      version: 1,
      r: {
        "": html(
          "<article><h1>Post</h1><!--proj:children:start--><!--proj:children:end--></article>"
        )
      }
    });

    expect(boundary.querySelector("article > h1").textContent).toBe("Post");
    expect(boundary.querySelector("section").textContent).toContain("Comment");
    expect(replyButton.isConnected).toBe(true);

    // Update the OUTER template: nested frame and its client button survive.
    outer.apply({
      version: 2,
      r: {
        "": html(
          "<article><h1>UPDATED</h1><!--proj:children:start--><!--proj:children:end--></article>"
        )
      }
    });
    expect(boundary.querySelector("h1").textContent).toBe("UPDATED");
    expect(boundary.querySelector("section").textContent).toContain("Comment");
    expect(replyButton.isConnected).toBe(true);

    // Update the INNER template independently: the client button still survives.
    inner.apply({
      version: 2,
      r: { "": html("<section>EDITED<!--proj:reply:start--><!--proj:reply:end--></section>") }
    });
    expect(boundary.querySelector("section").textContent).toContain("EDITED");
    expect(boundary.contains(replyButton)).toBe(true);
    expect(replyButton.isConnected).toBe(true);
  });
});

describe("wire chunk format", () => {
  it("maps each wire chunk type onto resident-store records", () => {
    expect(chunkToRecords({ type: "start", id: "f", version: 1 })).toEqual({});
    expect(chunkToRecords({ type: "html", id: "f", version: 1, html: "<p>x</p>" })).toEqual({
      "": { kind: "html", value: "<p>x</p>" }
    });
    expect(
      chunkToRecords({ type: "fragment", id: "f", version: 1, key: "p1", html: "<i>y</i>" })
    ).toEqual({ "seg:p1": { kind: "html", value: "<i>y</i>" } });
    expect(chunkToRecords({ type: "reveal", id: "f", version: 1, keys: ["p1", "p2"] })).toEqual({
      "seg:p1:reveal": true,
      "seg:p2:reveal": true
    });
    // A fallback reveal sets fallback gates instead of reveal gates.
    expect(
      chunkToRecords({ type: "reveal", id: "f", version: 1, keys: ["p1"], fallback: true })
    ).toEqual({ "seg:p1:fallback": true });
    // Data is response-scoped: it maps to no frame-store records — the host
    // delivers the payload through its `applyData` hook instead.
    expect(chunkToRecords({ type: "data", id: "f", version: 1, payload: "/*s*/" })).toEqual({});
    // Assets chunks are stored whole under the segment's assets key.
    const assets = { type: "assets", id: "f", version: 1, key: "p1", modules: ["/m.js"] };
    expect(chunkToRecords(assets)).toEqual({ "seg:p1:assets": assets });
    expect(chunkToRecords({ type: "complete", id: "f", version: 1 })).toEqual({
      ":complete": true
    });
  });

  it("delivers a data chunk to applyData whole, without touching the store", () => {
    const data = [];
    const host = createFrameHost({
      ...createMockSerializer(),
      applyData: c => data.push(c)
    });
    const frame = createFrame(boundary, { id: "f", host });

    const chunk = { type: "data", id: "f", version: 1, key: "user", node: { t: 1 }, initial: true };
    host.apply(chunk);

    expect(data).toEqual([chunk]);
    expect(Object.keys(frame.store)).toEqual([]);
  });

  it("drives a segment reveal through fragment + reveal wire chunks", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, { id: "f", host });

    host.apply({
      type: "html",
      id: "f",
      version: 1,
      html: `<section>${ph("p1")}</section>`
    });
    host.apply({ type: "fragment", id: "f", version: 1, key: "p1", html: "<p>Loaded</p>" });
    expect(boundary.innerHTML).toContain(ph("p1"));

    host.apply({ type: "reveal", id: "f", version: 1, keys: ["p1"] });
    expect(boundary.innerHTML).toBe("<section><p>Loaded</p></section>");
  });
});

describe("render-function slots", () => {
  it("invokes a render-fn slot with a resolved data prop", () => {
    const host = createFrameHost(createMockSerializer());
    const ref = host.serialize({ label: "Hi" });

    createFrame(boundary, {
      id: "f",
      host,
      slots: {
        greeting: props => {
          const b = document.createElement("b");
          b.textContent = props.data.label;
          return b;
        }
      }
    });

    host.apply({ type: "slot", id: "f", version: 1, key: "greeting", args: { data: ref } });
    host.apply({
      type: "html",
      id: "f",
      version: 1,
      html: "<p><!--proj:greeting:start--><!--proj:greeting:end--></p>"
    });

    expect(boundary.innerHTML).toBe(
      "<p><!--proj:greeting:start--><b>Hi</b><!--proj:greeting:end--></p>"
    );
  });

  it("reconciles a server-content prop in place while the client output is preserved", () => {
    const host = createFrameHost(createMockSerializer());
    const nameRef = host.serialize("ida");

    // props.children is the server-content region; the client renders around it.
    createFrame(boundary, {
      id: "outer",
      host,
      slots: {
        children: props => {
          const el = document.createElement("div");
          el.append("Client ", props.name, " ");
          el.append(props.children);
          return el;
        }
      }
    });

    host.apply({
      type: "slot",
      id: "outer",
      version: 1,
      key: "children",
      args: { name: nameRef, children: { $frame: "child" } }
    });
    host.apply({
      type: "html",
      id: "outer",
      version: 1,
      html: "<section><!--proj:children:start--><!--proj:children:end--></section>"
    });

    // Server streams the nested region's content, then updates it.
    host.apply({ type: "html", id: "child", version: 1, html: "<p>first</p>" });

    const wrapper = boundary.querySelector("section > div");
    const firstP = wrapper.querySelector("p");
    expect(wrapper.textContent).toContain("Client ida");
    expect(firstP.textContent).toBe("first");
    // No wrapper element around the server content: it sits directly in the
    // client output, between the region markers.
    expect(firstP.parentElement).toBe(wrapper);

    host.apply({ type: "html", id: "child", version: 2, html: "<p>second</p>" });

    // The client render output is not re-run: same wrapper, and the server
    // content morphed in place (same <p> element, new text).
    expect(boundary.querySelector("section > div")).toBe(wrapper);
    expect(wrapper.querySelector("p")).toBe(firstP);
    expect(firstP.textContent).toBe("second");
    expect(wrapper.textContent).toContain("Client ida");
  });

  it("re-calls the render function on an args change, preserving the region", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, {
      id: "outer",
      host,
      slots: {
        children: props => {
          const el = document.createElement("div");
          el.append("Hello ", props.name ?? "?", " ");
          if (props.children) el.append(props.children);
          return el;
        }
      }
    });
    host.apply({
      type: "slot",
      id: "outer",
      version: 1,
      key: "children",
      args: { name: host.serialize("ida"), children: { $frame: "child" } }
    });
    host.apply({
      type: "html",
      id: "outer",
      version: 1,
      html: "<section><!--proj:children:start--><!--proj:children:end--></section>"
    });
    host.apply({ type: "html", id: "child", version: 1, html: "<p>content</p>" });

    const p = boundary.querySelector("section p");
    expect(boundary.textContent).toContain("Hello ida");
    expect(p.textContent).toBe("content");

    // Args change (new data) -> re-call. Client output reflects new data; the
    // server-content region (its <p>) is reused across the re-call, not recreated.
    host.apply({
      type: "slot",
      id: "outer",
      version: 1,
      key: "children",
      args: { name: host.serialize("ada"), children: { $frame: "child" } }
    });
    expect(boundary.textContent).toContain("Hello ada");
    expect(boundary.querySelector("section p")).toBe(p);
    expect(p.textContent).toBe("content");

    // The region's frame is still live after the re-call: later chunks reconcile.
    host.apply({ type: "html", id: "child", version: 2, html: "<p>updated</p>" });
    expect(boundary.querySelector("section p")).toBe(p);
    expect(p.textContent).toBe("updated");
  });

  it("mounts with empty props on late args, then re-calls when the args arrive", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, {
      id: "f",
      host,
      slots: {
        label: props => {
          const b = document.createElement("b");
          b.textContent = props.text ? `Hi ${props.text}` : "...";
          return b;
        }
      }
    });

    // Range arrives before the slot args record.
    host.apply({
      type: "html",
      id: "f",
      version: 1,
      html: "<p><!--proj:label:start--><!--proj:label:end--></p>"
    });
    expect(boundary.innerHTML).toBe(
      "<p><!--proj:label:start--><b>...</b><!--proj:label:end--></p>"
    );

    // Args land later -> re-call with resolved props.
    host.apply({
      type: "slot",
      id: "f",
      version: 1,
      key: "label",
      args: { text: host.serialize("ida") }
    });
    expect(boundary.innerHTML).toBe(
      "<p><!--proj:label:start--><b>Hi ida</b><!--proj:label:end--></p>"
    );
  });
});

describe("iterated callback slots", () => {
  const commentSlot = {
    comment: props => {
      const li = document.createElement("li");
      li.textContent = props.text ?? "?";
      return li;
    }
  };
  const listHtml = n =>
    "<ul>" +
    Array.from(
      { length: n },
      (_, i) => `<!--proj:comment#${i}:start--><!--proj:comment#${i}:end-->`
    ).join("") +
    "</ul>";

  it("invokes one callback per occurrence (iteration)", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, { id: "f", host, slots: commentSlot });

    ["first", "second", "third"].forEach((text, i) => {
      host.apply({
        type: "slot",
        id: "f",
        version: 1,
        key: `comment#${i}`,
        args: { text: host.serialize(text) }
      });
    });
    host.apply({ type: "html", id: "f", version: 1, html: listHtml(3) });

    const items = [...boundary.querySelectorAll("li")];
    expect(items.map(li => li.textContent)).toEqual(["first", "second", "third"]);
  });

  it("re-calls only the changed occurrence, preserving its siblings", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, { id: "f", host, slots: commentSlot });
    ["first", "second", "third"].forEach((text, i) => {
      host.apply({
        type: "slot",
        id: "f",
        version: 1,
        key: `comment#${i}`,
        args: { text: host.serialize(text) }
      });
    });
    host.apply({ type: "html", id: "f", version: 1, html: listHtml(3) });

    const before = [...boundary.querySelectorAll("li")];
    host.apply({
      type: "slot",
      id: "f",
      version: 1,
      key: "comment#1",
      args: { text: host.serialize("SECOND") }
    });
    const after = [...boundary.querySelectorAll("li")];

    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
    expect(after[1]).not.toBe(before[1]);
    expect(after.map(li => li.textContent)).toEqual(["first", "SECOND", "third"]);
  });

  it("reorders instances by occurrence id, so client state follows the id", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, { id: "f", host, slots: commentSlot });
    ["first", "second", "third"].forEach((text, i) => {
      host.apply({
        type: "slot",
        id: "f",
        version: 1,
        key: `comment#${i}`,
        args: { text: host.serialize(text) }
      });
    });
    host.apply({ type: "html", id: "f", version: 1, html: listHtml(3) });

    const [li0, li1, li2] = boundary.querySelectorAll("li");
    // Client-only state stamped on each node (exists in no chunk).
    li0.dataset.seen = "0";
    li1.dataset.seen = "1";
    li2.dataset.seen = "2";

    // Server reorders the occurrences (same ids, new positions), args unchanged.
    const order = (...ids) =>
      "<ul>" +
      ids.map(i => `<!--proj:comment#${i}:start--><!--proj:comment#${i}:end-->`).join("") +
      "</ul>";
    host.apply({ type: "html", id: "f", version: 1, html: order(2, 0, 1) });

    // Each instance moved to its new position carrying its identity + state; no
    // re-call happened (args unchanged). (A real browser would drop focus on the
    // moved ranges without moveBefore — identity/state still survive.)
    const after = [...boundary.querySelectorAll("li")];
    expect(after).toEqual([li2, li0, li1]);
    expect(after.map(li => li.textContent)).toEqual(["third", "first", "second"]);
    expect(after.map(li => li.dataset.seen)).toEqual(["2", "0", "1"]);
  });

  it("unmounts an occurrence when its range disappears", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, { id: "f", host, slots: commentSlot });
    ["first", "second", "third"].forEach((text, i) => {
      host.apply({
        type: "slot",
        id: "f",
        version: 1,
        key: `comment#${i}`,
        args: { text: host.serialize(text) }
      });
    });
    host.apply({ type: "html", id: "f", version: 1, html: listHtml(3) });
    const first = boundary.querySelector("li");

    // Same-version root update dropping the last occurrence.
    host.apply({ type: "html", id: "f", version: 1, html: listHtml(2) });

    const items = [...boundary.querySelectorAll("li")];
    expect(items.length).toBe(2);
    expect(items[0]).toBe(first);
    expect(items.map(li => li.textContent)).toEqual(["first", "second"]);
  });
});

describe("client slots revealed inside server-content regions", () => {
  it("fills a nested client slot streamed into a region via the threaded callback", () => {
    const host = createFrameHost(createMockSerializer());
    // One recursive callback: a comment renders its text and its (server) children.
    createFrame(boundary, {
      id: "root",
      host,
      slots: {
        comment: props => {
          const li = document.createElement("li");
          li.append(props.text);
          if (props.children) li.append(props.children);
          return li;
        }
      }
    });

    // Root reveals one comment whose children arg is a server-content region.
    host.apply({
      type: "slot",
      id: "root",
      version: 1,
      key: "comment#0",
      args: { text: host.serialize("parent"), children: { $frame: "c0" } }
    });
    host.apply({
      type: "html",
      id: "root",
      version: 1,
      html: "<ul><!--proj:comment#0:start--><!--proj:comment#0:end--></ul>"
    });

    // Stream into the region content that reveals a NESTED comment occurrence.
    host.apply({
      type: "slot",
      id: "c0",
      version: 1,
      key: "comment#0",
      args: { text: host.serialize("child") }
    });
    host.apply({
      type: "html",
      id: "c0",
      version: 1,
      html: "<div>body<!--proj:comment#0:start--><!--proj:comment#0:end--></div>"
    });

    // The nested slot inside the streamed region was filled by the inherited
    // (threaded) callback — no registry, no separate request.
    const items = boundary.querySelectorAll("li");
    expect(items.length).toBe(2);
    expect(boundary.textContent).toContain("parent");
    expect(boundary.textContent).toContain("body");
    expect(boundary.textContent).toContain("child");
    // The nested comment <li> lives inside the parent comment <li>.
    expect(items[0].contains(items[1])).toBe(true);
  });
});

describe("recursive comments (HN-shaped)", () => {
  const projRange = id => `<!--proj:${id}:start--><!--proj:${id}:end-->`;

  it("iterates, recurses, and preserves client-only collapse across a server update", () => {
    const host = createFrameHost(createMockSerializer());

    // One recursive client callback: a comment renders a collapse toggle, its
    // body, and a client-owned <ul> holding its (server) child comments. The
    // collapsed flag lives only on the client — never in any chunk.
    createFrame(boundary, {
      id: "root",
      host,
      slots: {
        comment: props => {
          const li = document.createElement("li");
          const toggle = document.createElement("button");
          toggle.textContent = "toggle";
          const body = document.createElement("span");
          body.textContent = props.text;
          const kids = document.createElement("ul");
          kids.className = "kids";
          if (props.children) kids.append(props.children);
          toggle.addEventListener("click", () => {
            kids.hidden = !kids.hidden;
          });
          li.append(toggle, body, kids);
          return li;
        }
      }
    });

    // Tree: A > [ A1 > [A1a], A2 ]. Root reveals A; each level's children are a
    // server-content region streamed separately.
    host.apply({
      type: "slot",
      id: "root",
      version: 1,
      key: "comment#0",
      args: { text: host.serialize("A"), children: { $frame: "cA" } }
    });
    host.apply({
      type: "html",
      id: "root",
      version: 1,
      html: `<ul>${projRange("comment#0")}</ul>`
    });

    host.apply({
      type: "slot",
      id: "cA",
      version: 1,
      key: "comment#0",
      args: { text: host.serialize("A1"), children: { $frame: "cA1" } }
    });
    host.apply({
      type: "slot",
      id: "cA",
      version: 1,
      key: "comment#1",
      args: { text: host.serialize("A2") }
    });
    host.apply({
      type: "html",
      id: "cA",
      version: 1,
      html: `${projRange("comment#0")}${projRange("comment#1")}`
    });

    host.apply({
      type: "slot",
      id: "cA1",
      version: 1,
      key: "comment#0",
      args: { text: host.serialize("A1a") }
    });
    host.apply({ type: "html", id: "cA1", version: 1, html: projRange("comment#0") });

    // Iteration (A1, A2) + recursion (A > A1 > A1a) all filled by one callback.
    expect(boundary.querySelectorAll("li").length).toBe(4);
    ["A", "A1", "A2", "A1a"].forEach(t => expect(boundary.textContent).toContain(t));

    // Collapse A — a purely client action (CSS hide, no chunk, no server call).
    const aKids = boundary.querySelector("li > ul.kids");
    const aToggle = boundary.querySelector("li > button");
    expect(aKids.hidden).toBe(false);
    aToggle.click();
    expect(aKids.hidden).toBe(true);

    // Server streams a new grandchild (A1b) deep inside the collapsed subtree.
    // It reconciles in place; no client callback is re-run.
    host.apply({
      type: "slot",
      id: "cA1",
      version: 1,
      key: "comment#1",
      args: { text: host.serialize("A1b") }
    });
    host.apply({
      type: "html",
      id: "cA1",
      version: 1,
      html: `${projRange("comment#0")}${projRange("comment#1")}`
    });

    // The new content applied, and A's client-only collapse survived the update.
    expect(boundary.querySelectorAll("li").length).toBe(5);
    expect(boundary.textContent).toContain("A1b");
    expect(aKids.hidden).toBe(true);
  });

  it("assembles a deep tree from an out-of-order stream (thread-through streaming)", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, {
      id: "root",
      host,
      slots: {
        comment: props => {
          const li = document.createElement("li");
          li.append(props.text);
          const kids = document.createElement("ul");
          if (props.children) kids.append(props.children);
          li.append(kids);
          return li;
        }
      }
    });

    // Stream the DEEPEST levels first — their frames don't exist yet, so the
    // host buffers these chunks by id.
    host.apply({
      type: "slot",
      id: "cA1",
      version: 1,
      key: "comment#0",
      args: { text: host.serialize("A1a") }
    });
    host.apply({ type: "html", id: "cA1", version: 1, html: projRange("comment#0") });
    host.apply({
      type: "slot",
      id: "cA",
      version: 1,
      key: "comment#0",
      args: { text: host.serialize("A1"), children: { $frame: "cA1" } }
    });
    host.apply({ type: "html", id: "cA", version: 1, html: projRange("comment#0") });

    // Nothing renders yet: the root (which creates the chain) hasn't arrived.
    expect(boundary.querySelectorAll("li").length).toBe(0);

    // The root arrives last and triggers the cascade: each region binds and its
    // buffered chunks flush in dependency order, deepest resolving last.
    host.apply({
      type: "slot",
      id: "root",
      version: 1,
      key: "comment#0",
      args: { text: host.serialize("A"), children: { $frame: "cA" } }
    });
    host.apply({
      type: "html",
      id: "root",
      version: 1,
      html: `<ul>${projRange("comment#0")}</ul>`
    });

    expect(boundary.querySelectorAll("li").length).toBe(3);
    ["A", "A1", "A1a"].forEach(t => expect(boundary.textContent).toContain(t));
    // Nesting is correct: A contains A1 contains A1a.
    const [a, a1, a1a] = boundary.querySelectorAll("li");
    expect(a.contains(a1)).toBe(true);
    expect(a1.contains(a1a)).toBe(true);
  });

  it("reveals an async segment (containing a client slot) inside a threaded region", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, {
      id: "root",
      host,
      slots: {
        comment: props => {
          const li = document.createElement("li");
          li.append(props.text);
          const kids = document.createElement("div");
          if (props.children) kids.append(props.children);
          li.append(kids);
          return li;
        }
      }
    });

    host.apply({
      type: "slot",
      id: "root",
      version: 1,
      key: "comment#0",
      args: { text: host.serialize("A"), children: { $frame: "cA" } }
    });
    host.apply({
      type: "html",
      id: "root",
      version: 1,
      html: `<ul>${projRange("comment#0")}</ul>`
    });

    // The region's own content has an async segment placeholder.
    host.apply({ type: "html", id: "cA", version: 1, html: `<div>body${ph("more")}</div>` });
    // Args for the lazy child arrive before the segment is revealed.
    host.apply({
      type: "slot",
      id: "cA",
      version: 1,
      key: "comment#0",
      args: { text: host.serialize("lazy") }
    });

    // Segment not yet revealed: body is shown, the lazy child is not.
    expect(boundary.textContent).toContain("body");
    expect(boundary.textContent).not.toContain("lazy");
    expect(boundary.innerHTML).toContain(ph("more"));

    // The segment content (which itself contains a client slot) streams in, then
    // its reveal gate. On reveal the segment materializes and its client slot is
    // filled by the threaded callback.
    host.apply({
      type: "fragment",
      id: "cA",
      version: 1,
      key: "more",
      html: `<ul>${projRange("comment#0")}</ul>`
    });
    host.apply({ type: "reveal", id: "cA", version: 1, keys: ["more"] });

    expect(boundary.textContent).toContain("lazy");
    expect(boundary.querySelectorAll("li").length).toBe(2);
    // The lazy comment lives inside the revealed segment, inside A.
    const [a, lazy] = boundary.querySelectorAll("li");
    expect(a.contains(lazy)).toBe(true);
  });
});

describe("hydration attach (adopted SSR DOM)", () => {
  const ssrDom =
    "<article><h1>Story</h1>" +
    "<!--proj:children:start--><button>0</button><!--proj:children:end-->" +
    "</article>";

  it("claims existing range content in place when the callback returns undefined", () => {
    boundary.innerHTML = ssrDom;
    const ssrButton = boundary.querySelector("button");
    let seen;
    createFrame(boundary, {
      adopt: true,
      slots: {
        children: (props, ctx) => {
          seen = ctx.existing;
          // Bind behavior onto the server-rendered DOM — a stand-in for a
          // framework hydrating over the range — and claim it.
          ctx.existing[0].addEventListener("click", e => {
            e.target.textContent = String(Number(e.target.textContent) + 1);
          });
          return undefined;
        }
      }
    });
    // Zero DOM mutation: same node, same markup.
    expect(boundary.querySelector("button")).toBe(ssrButton);
    expect(boundary.innerHTML).toBe(ssrDom);
    expect(seen).toEqual([ssrButton]);
    ssrButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(ssrButton.textContent).toBe("1");
  });

  it("replaces existing range content when the callback returns nodes (client render)", () => {
    boundary.innerHTML = ssrDom;
    const fresh = document.createElement("input");
    createFrame(boundary, {
      adopt: true,
      slots: { children: () => fresh }
    });
    // No duplication: the SSR content is gone, the client content is in.
    expect(boundary.querySelectorAll("button").length).toBe(0);
    expect(boundary.querySelector("input")).toBe(fresh);
    expect(boundary.innerHTML).toBe(
      "<article><h1>Story</h1><!--proj:children:start--><input><!--proj:children:end--></article>"
    );
  });

  it("attaches without any chunk arriving, then preserves the claim across a morph", () => {
    boundary.innerHTML = ssrDom;
    const ssrButton = boundary.querySelector("button");
    ssrButton.dataset.bound = "yes"; // client-only state applied at attach
    const frame = createFrame(boundary, {
      adopt: true,
      slots: { children: (p, ctx) => void ctx.existing }
    });
    // A later stream update morphs server content around the claimed range.
    frame.apply({
      version: 2,
      r: {
        "": html(
          "<article><h1>Story updated</h1>" +
            "<!--proj:children:start--><!--proj:children:end-->" +
            "</article>"
        )
      }
    });
    expect(boundary.querySelector("h1").textContent).toBe("Story updated");
    expect(boundary.querySelector("button")).toBe(ssrButton);
    expect(ssrButton.dataset.bound).toBe("yes");
  });

  it("mounts fresh (empty-range) slots identically to before through the replace path", () => {
    boundary.innerHTML =
      "<div><!--proj:children:start--><!--proj:children:end--></div>";
    const el = document.createElement("span");
    el.textContent = "new";
    createFrame(boundary, { adopt: true, slots: { children: () => el } });
    expect(boundary.innerHTML).toBe(
      "<div><!--proj:children:start--><span>new</span><!--proj:children:end--></div>"
    );
  });
});

describe("template / block payload mode", () => {
  it("materializes many block instances from one shared template (markup sent once)", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, { id: "f", host });

    host.apply({
      type: "html",
      id: "f",
      version: 1,
      html: `<ul>${ph("c0")}${ph("c1")}${ph("c2")}</ul>`
    });
    host.apply({
      type: "template",
      id: "f",
      version: 1,
      key: "comment",
      html: "<li><b><!--field:author--></b>: <!--field:text--></li>",
      fields: ["author", "text"]
    });
    host.apply({
      type: "block",
      id: "f",
      version: 1,
      key: "c0",
      template: "comment",
      values: ["Ada", "first"]
    });
    host.apply({
      type: "block",
      id: "f",
      version: 1,
      key: "c1",
      template: "comment",
      values: ["Grace", "second"]
    });
    host.apply({
      type: "block",
      id: "f",
      version: 1,
      key: "c2",
      template: "comment",
      values: ["Linus", "third"]
    });
    host.apply({ type: "reveal", id: "f", version: 1, keys: ["c0", "c1", "c2"] });

    expect(boundary.innerHTML).toBe(
      "<ul><li><b>Ada</b>: first</li><li><b>Grace</b>: second</li><li><b>Linus</b>: third</li></ul>"
    );

    // The markup lives once, as a single template record; each instance carries
    // only its values — that is the deduplication.
    const frame = host.get("f");
    expect(frame.store["tpl:comment"].kind).toBe("template");
    expect(frame.store["seg:c0"]).toEqual({
      kind: "block",
      template: "tpl:comment",
      values: ["Ada", "first"]
    });
    expect(frame.store["seg:c2"]).toEqual({
      kind: "block",
      template: "tpl:comment",
      values: ["Linus", "third"]
    });
  });

  it("buffers a block that arrives before its template, then reveals it", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(boundary, { id: "f", host });

    host.apply({ type: "html", id: "f", version: 1, html: `<ul>${ph("c0")}</ul>` });
    host.apply({
      type: "block",
      id: "f",
      version: 1,
      key: "c0",
      template: "comment",
      values: ["Ada"]
    });
    host.apply({ type: "reveal", id: "f", version: 1, keys: ["c0"] });

    // Template dependency not yet present -> block is buffered, not revealed.
    expect(host.get("f").isRevealed("c0")).toBe(false);
    expect(boundary.innerHTML).toContain(ph("c0"));

    host.apply({
      type: "template",
      id: "f",
      version: 1,
      key: "comment",
      html: "<li><!--field:author--></li>",
      fields: ["author"]
    });

    expect(host.get("f").isRevealed("c0")).toBe(true);
    expect(boundary.innerHTML).toBe("<ul><li>Ada</li></ul>");
  });
});

describe("chunk addressing", () => {
  it("routes addressed chunks to the right frame by id", () => {
    const host = createFrameHost(createMockSerializer());
    const a = document.createElement("div");
    const b = document.createElement("div");
    document.body.append(a, b);
    createFrame(a, { id: "a", host });
    createFrame(b, { id: "b", host });

    host.apply({ type: "html", id: "a", version: 1, html: "<p>A</p>" });
    host.apply({ type: "html", id: "b", version: 1, html: "<p>B</p>" });

    expect(a.innerHTML).toBe("<p>A</p>");
    expect(b.innerHTML).toBe("<p>B</p>");
  });

  it("buffers a chunk for a not-yet-registered frame and flushes on register", () => {
    const host = createFrameHost(createMockSerializer());
    const el = document.createElement("div");
    document.body.appendChild(el);

    // Chunk arrives before the frame exists.
    host.apply({ type: "html", id: "late", version: 1, html: "<p>buffered</p>" });
    expect(el.innerHTML).toBe("");

    createFrame(el, { id: "late", host });
    expect(el.innerHTML).toBe("<p>buffered</p>");
  });

  it("routes a flat, out-of-order stream through a recursive frame tree", () => {
    const host = createFrameHost(createMockSerializer());
    const replyButton = document.createElement("button");
    replyButton.textContent = "reply";

    createFrame(boundary, {
      id: "outer",
      host,
      slots: {
        children: () => {
          const innerHost = document.createElement("div");
          // The nested server frame registers itself; any buffered "inner"
          // chunk flushes into it immediately.
          createFrame(innerHost, { id: "inner", host, slots: { reply: () => replyButton } });
          return innerHost;
        }
      }
    });

    // Stream the INNER chunk before the OUTER chunk. Inner cannot exist until
    // outer renders the slot that creates it, so it is buffered.
    host.apply({
      type: "html",
      id: "inner",
      version: 1,
      html: "<section>Comment<!--proj:reply:start--><!--proj:reply:end--></section>"
    });
    host.apply({
      type: "html",
      id: "outer",
      version: 1,
      html: "<article><h1>Post</h1><!--proj:children:start--><!--proj:children:end--></article>"
    });

    expect(boundary.querySelector("article > h1").textContent).toBe("Post");
    expect(boundary.querySelector("section").textContent).toContain("Comment");
    expect(replyButton.isConnected).toBe(true);

    // Address a later update straight to the nested frame; client button survives.
    host.apply({
      type: "html",
      id: "inner",
      version: 2,
      html: "<section>EDITED<!--proj:reply:start--><!--proj:reply:end--></section>"
    });
    expect(boundary.querySelector("section").textContent).toContain("EDITED");
    expect(boundary.contains(replyButton)).toBe(true);
    expect(replyButton.isConnected).toBe(true);
  });
});

describe("frame lifecycle", () => {
  it("dispose unregisters the frame and ignores later chunks", () => {
    const host = createFrameHost(createMockSerializer());
    const el = document.createElement("div");
    document.body.appendChild(el);
    const frame = createFrame(el, { id: "x", host });
    host.apply({ type: "html", id: "x", version: 1, html: "<p>a</p>" });
    expect(el.innerHTML).toBe("<p>a</p>");

    frame.dispose();
    expect(host.get("x")).toBeUndefined();

    // A later chunk has no registered frame and is buffered, not applied.
    host.apply({ type: "html", id: "x", version: 2, html: "<p>b</p>" });
    expect(el.innerHTML).toBe("<p>a</p>");
  });

  it("drops stale buffered chunks, keeping only the newest version", () => {
    const host = createFrameHost(createMockSerializer());
    const el = document.createElement("div");
    document.body.appendChild(el);

    host.apply({ type: "html", id: "y", version: 1, html: "<p>v1</p>" });
    host.apply({ type: "html", id: "y", version: 2, html: "<p>v2</p>" });
    // A late v1 chunk is stale relative to the buffered v2 and is discarded.
    host.apply({ type: "html", id: "y", version: 1, html: "<p>late-v1</p>" });

    createFrame(el, { id: "y", host });
    expect(el.innerHTML).toBe("<p>v2</p>");
  });

  it("cascades disposal to a nested frame when its parent slot is removed", () => {
    const host = createFrameHost(createMockSerializer());
    const button = document.createElement("button");
    button.textContent = "reply";
    let innerDisposed = false;

    createFrame(boundary, {
      id: "outer",
      host,
      slots: {
        children: (_props, ctx) => {
          const innerHost = document.createElement("div");
          const inner = createFrame(innerHost, {
            id: "inner",
            host,
            slots: { reply: () => button }
          });
          ctx.onCleanup(() => {
            inner.dispose();
            innerDisposed = true;
          });
          return innerHost;
        }
      }
    });

    host.apply({
      type: "html",
      id: "outer",
      version: 1,
      html: "<article><!--proj:children:start--><!--proj:children:end--></article>"
    });
    host.apply({
      type: "html",
      id: "inner",
      version: 1,
      html: "<section>c<!--proj:reply:start--><!--proj:reply:end--></section>"
    });
    expect(host.get("inner")).toBeDefined();
    expect(button.isConnected).toBe(true);

    // Outer template drops the slot entirely -> nested frame disposed + unregistered.
    host.apply({ type: "html", id: "outer", version: 2, html: "<article>no slot</article>" });
    expect(innerDisposed).toBe(true);
    expect(host.get("inner")).toBeUndefined();
    expect(button.isConnected).toBe(false);
    expect(boundary.innerHTML).toBe("<article>no slot</article>");
  });
});

describe("coarse perf direction", () => {
  const N = 500;
  const listHTML = changedIndex => {
    let items = "";
    for (let i = 0; i < N; i++) {
      items += `<li>item ${i === changedIndex ? "CHANGED" : i}</li>`;
    }
    return `<ul>${items}</ul>`;
  };

  it("morph reuses unchanged nodes where full replace recreates them", () => {
    // Morph path.
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html(listHTML(-1)) } });
    const ulMorph = boundary.firstElementChild;
    const before = Array.from(ulMorph.children);

    const t0 = performance.now();
    frame.apply({ version: 2, r: { "": html(listHTML(250)) } });
    const morphMs = performance.now() - t0;

    const after = Array.from(ulMorph.children);
    let preserved = 0;
    for (let i = 0; i < N; i++) if (before[i] === after[i]) preserved++;
    // Every <li> instance is reused; only one text node's data changed.
    expect(preserved).toBe(N);
    expect(ulMorph.children[250].textContent).toBe("item CHANGED");

    // Full-replace baseline recreates every node.
    const other = document.createElement("div");
    document.body.appendChild(other);
    other.innerHTML = listHTML(-1);
    const beforeReplace = Array.from(other.firstElementChild.children);
    const t1 = performance.now();
    other.innerHTML = listHTML(250);
    const replaceMs = performance.now() - t1;
    const afterReplace = Array.from(other.firstElementChild.children);
    expect(beforeReplace[0]).not.toBe(afterReplace[0]);

    // Directional signal only (not a strict benchmark assertion).
    // eslint-disable-next-line no-console
    console.log(`[perf] morph=${morphMs.toFixed(2)}ms replace=${replaceMs.toFixed(2)}ms`);
  });

  it("segment reveal touches only the placeholder, not siblings", () => {
    const frame = createFrame(boundary);
    frame.apply({
      version: 1,
      r: { "": html(`<section><b>keep</b>${ph("p1")}<i>keep2</i></section>`) }
    });
    const section = boundary.firstElementChild;
    const b = section.querySelector("b");
    const iEl = section.querySelector("i");

    frame.apply({ version: 1, r: { "seg:p1": html("<p>Loaded</p>"), "seg:p1:reveal": true } });

    // Both markers are gone after the reveal; sibling identities preserved.
    expect(section.querySelector("b")).toBe(b);
    expect(section.querySelector("i")).toBe(iEl);
    expect(boundary.innerHTML).toBe("<section><b>keep</b><p>Loaded</p><i>keep2</i></section>");
  });
});
