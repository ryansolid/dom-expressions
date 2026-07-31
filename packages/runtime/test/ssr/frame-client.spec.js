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
import {
  createFrame,
  createFrameHost,
  chunkToRecords,
  FRAME_APPLIED_EVENT
} from "../../src/frame-client";

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

    const range = "<!--slot:panel#0:start--><!--slot:panel#0:end-->";
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

  it("preserves a user-toggled <details open> across a morph (browser-owned state)", () => {
    const frame = withContent("<details><summary>s</summary><p>body v1</p></details>");
    const details = boundary.firstElementChild;
    // The user opens it — a browser-owned toggle the server never sees.
    details.open = true;
    expect(details.hasAttribute("open")).toBe(true);
    // A navigation morph re-renders the details as the server default (closed).
    frame.apply({
      version: 2,
      r: { "": html("<details><summary>s</summary><p>body v2</p></details>") }
    });
    // Same element, content morphed, but the user's open state survives.
    expect(boundary.firstElementChild).toBe(details);
    expect(details.open).toBe(true);
    expect(details.querySelector("p").textContent).toBe("body v2");
  });

  it("does not force a user-closed <details> back open when the server renders it open", () => {
    const frame = withContent("<details open><summary>s</summary><p>v1</p></details>");
    const details = boundary.firstElementChild;
    details.open = false; // user closes it
    frame.apply({
      version: 2,
      r: { "": html("<details open><summary>s</summary><p>v2</p></details>") }
    });
    expect(details.open).toBe(false); // user wins
    expect(details.querySelector("p").textContent).toBe("v2");
  });

  it("leaves a data-preserve element's attributes and subtree untouched", () => {
    const frame = withContent('<div data-preserve class="widget"><span>init</span></div>');
    const widget = boundary.firstElementChild;
    const span = widget.firstElementChild;
    // A third-party widget mutates the interior after mount.
    span.textContent = "runtime-state";
    widget.setAttribute("data-ready", "1");
    // The morph tries to reset it to fresh server output.
    frame.apply({
      version: 2,
      r: { "": html('<div data-preserve class="widget"><span>server</span></div>') }
    });
    // Frozen: same nodes, runtime state intact, server output ignored.
    expect(boundary.firstElementChild).toBe(widget);
    expect(widget.firstElementChild).toBe(span);
    expect(span.textContent).toBe("runtime-state");
    expect(widget.getAttribute("data-ready")).toBe("1");
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

  it("preserves a protected slot range and its client-owned interior", () => {
    const frame = withContent("<div><!--slot:0:start--><!--slot:0:end--></div>");
    const div = boundary.firstElementChild;

    // Simulate client code mounting owned content inside the slot range.
    const start = Array.from(div.childNodes).find(
      n => n.nodeType === 8 && n.data === "slot:0:start"
    );
    const clientSpan = document.createElement("span");
    clientSpan.textContent = "client";
    start.after(clientSpan);
    expect(div.innerHTML).toBe("<!--slot:0:start--><span>client</span><!--slot:0:end-->");

    // Server-owned surroundings change; the slot interior must survive.
    frame.apply({
      version: 2,
      r: { "": html("<div>prefix<!--slot:0:start--><!--slot:0:end-->suffix</div>") }
    });

    expect(boundary.firstElementChild).toBe(div);
    // The exact same client node instance is preserved (not recreated).
    expect(div.contains(clientSpan)).toBe(true);
    expect(clientSpan.parentNode).toBe(div);
    expect(div.innerHTML).toBe(
      "prefix<!--slot:0:start--><span>client</span><!--slot:0:end-->suffix"
    );
  });

  it("does not diff inside a slot range even when server sends interior", () => {
    const frame = withContent("<div><!--slot:0:start--><!--slot:0:end--></div>");
    const div = boundary.firstElementChild;
    const start = Array.from(div.childNodes).find(
      n => n.nodeType === 8 && n.data === "slot:0:start"
    );
    const clientSpan = document.createElement("span");
    clientSpan.textContent = "client-owned";
    start.after(clientSpan);

    // Server resends the slot with placeholder interior; client wins.
    frame.apply({
      version: 2,
      r: { "": html("<div><!--slot:0:start--><em>server</em><!--slot:0:end--></div>") }
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
      r: { "": html("<div><p>a</p><!--slot:0:start--><!--slot:0:end--><p>b</p></div>") }
    });
    const div = boundary.firstElementChild;
    const clientNode = document.createElement("input");
    clientNode.value = "typed";
    findComment(div, "slot:0:start").after(clientNode);
    expect(clientNode.isConnected).toBe(true);

    // Server churn: change both <p> texts and insert a new server sibling before
    // the slot range.
    frame.apply({
      version: 2,
      r: {
        "": html("<div><p>A</p><span>new</span><!--slot:0:start--><!--slot:0:end--><p>B</p></div>")
      }
    });

    // The exact client node instance is preserved, still connected, value intact.
    expect(clientNode.isConnected).toBe(true);
    expect(div.contains(clientNode)).toBe(true);
    expect(clientNode.value).toBe("typed");
    // Still bracketed by its slot markers.
    expect(clientNode.previousSibling.data).toBe("slot:0:start");
    expect(clientNode.nextSibling.data).toBe("slot:0:end");
    expect(div.innerHTML).toBe(
      "<p>A</p><span>new</span><!--slot:0:start--><input><!--slot:0:end--><p>B</p>"
    );
  });

  it("preserves each range's client interior by id across a reorder", () => {
    const frame = createFrame(boundary);
    frame.apply({
      version: 1,
      r: {
        "": html(
          "<div><!--slot:0:start--><!--slot:0:end--><!--slot:1:start--><!--slot:1:end--></div>"
        )
      }
    });
    const div = boundary.firstElementChild;
    const a = document.createElement("span");
    a.textContent = "A";
    const b = document.createElement("span");
    b.textContent = "B";
    findComment(div, "slot:0:start").after(a);
    findComment(div, "slot:1:start").after(b);

    // Server reorders the two ranges. State follows the id, not the position.
    // (This path uses ordinary insertBefore, so a real browser would lose focus
    // here without moveBefore; identity and structure are still correct.)
    frame.apply({
      version: 2,
      r: {
        "": html(
          "<div><!--slot:1:start--><!--slot:1:end--><!--slot:0:start--><!--slot:0:end--></div>"
        )
      }
    });

    expect(div.contains(a)).toBe(true);
    expect(div.contains(b)).toBe(true);
    // A stays inside range 0, B inside range 1, and the ranges swapped order.
    expect(a.previousSibling.data).toBe("slot:0:start");
    expect(b.previousSibling.data).toBe("slot:1:start");
    expect(div.innerHTML).toBe(
      "<!--slot:1:start--><span>B</span><!--slot:1:end--><!--slot:0:start--><span>A</span><!--slot:0:end-->"
    );
  });

  it("relocates keyed slot ranges ACROSS parents (deleting a list item shifts the rest)", () => {
    // The notes-list delete shape: three keyed occurrences, one per <li>.
    // Removing the first item puts every remaining range under a DIFFERENT
    // <li> in the new content — pairwise element matching sees only "new id
    // here" and, without the frame-wide range index, adopted the incoming
    // EMPTY marker pair while the live interior was destroyed with its old
    // parent (and the record dedupe then never re-invoked the occurrence).
    const frame = createFrame(boundary);
    const li = id => `<li><!--slot:item#${id}:start--><!--slot:item#${id}:end--></li>`;
    frame.apply({ version: 1, r: { "": html(`<ul>${li(0)}${li(1)}${li(2)}</ul>`) } });
    const ul = boundary.firstElementChild;
    const fill = (id, text) => {
      const span = document.createElement("span");
      span.textContent = text;
      findComment(ul, `slot:item#${id}:start`).after(span);
      return span;
    };
    const a = fill(0, "A");
    const b = fill(1, "B");
    const c = fill(2, "C");

    // Item 0 deleted: item#1 now lives in the first <li>, item#2 in the second.
    frame.apply({ version: 2, r: { "": html(`<ul>${li(1)}${li(2)}</ul>`) } });

    expect(a.isConnected).toBe(false);
    expect(ul.contains(b)).toBe(true);
    expect(ul.contains(c)).toBe(true);
    expect(b.previousSibling.data).toBe("slot:item#1:start");
    expect(c.previousSibling.data).toBe("slot:item#2:start");
    expect(ul.innerHTML).toBe(
      "<li><!--slot:item#1:start--><span>B</span><!--slot:item#1:end--></li>" +
        "<li><!--slot:item#2:start--><span>C</span><!--slot:item#2:end--></li>"
    );
  });

  it("relocates a range whose old parent reconciles BEFORE its new position (stash path)", () => {
    // The range's old container is processed (and its leftovers removed)
    // before the sibling that now holds the range's position. The removal
    // sweep must stash the range intact instead of severing it node by node.
    const frame = createFrame(boundary);
    frame.apply({
      version: 1,
      r: {
        "": html("<div><section><!--slot:x:start--><!--slot:x:end--></section><p></p></div>")
      }
    });
    const div = boundary.firstElementChild;
    const clientNode = document.createElement("input");
    clientNode.value = "typed";
    findComment(div, "slot:x:start").after(clientNode);

    frame.apply({
      version: 2,
      r: {
        "": html("<div><section></section><p><!--slot:x:start--><!--slot:x:end--></p></div>")
      }
    });

    expect(clientNode.isConnected).toBe(true);
    expect(clientNode.value).toBe("typed");
    expect(div.innerHTML).toBe(
      "<section></section><p><!--slot:x:start--><input><!--slot:x:end--></p>"
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
      r: { "": html("<div>server<!--slot:0:start--><!--slot:0:end--></div>") }
    });

    expect(boundary.innerHTML).toBe(
      "<div>server<!--slot:0:start--><button>client</button><!--slot:0:end--></div>"
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
      r: { "": html("<div><h1>A</h1><!--slot:0:start--><!--slot:0:end--></div>") }
    });
    frame.apply({
      version: 2,
      r: { "": html("<div><h1>B</h1><!--slot:0:start--><!--slot:0:end--></div>") }
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
      r: { "": html("<div><!--slot:0:start--><!--slot:0:end--></div>") }
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
              "": html("<section>Comment<!--slot:reply:start--><!--slot:reply:end--></section>")
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
          "<article><h1>Post</h1><!--slot:children:start--><!--slot:children:end--></article>"
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
          "<article><h1>UPDATED</h1><!--slot:children:start--><!--slot:children:end--></article>"
        )
      }
    });
    expect(boundary.querySelector("h1").textContent).toBe("UPDATED");
    expect(boundary.querySelector("section").textContent).toContain("Comment");
    expect(replyButton.isConnected).toBe(true);

    // Update the INNER template independently: the client button still survives.
    inner.apply({
      version: 2,
      r: { "": html("<section>EDITED<!--slot:reply:start--><!--slot:reply:end--></section>") }
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
      html: "<p><!--slot:greeting:start--><!--slot:greeting:end--></p>"
    });

    expect(boundary.innerHTML).toBe(
      "<p><!--slot:greeting:start--><b>Hi</b><!--slot:greeting:end--></p>"
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
      html: "<section><!--slot:children:start--><!--slot:children:end--></section>"
    });

    // Server streams the nested region's content, then updates it.
    host.apply({ type: "html", id: "child", version: 1, html: "<p>first</p>" });

    const wrapper = boundary.querySelector("section > div");
    const firstP = wrapper.querySelector("p");
    expect(wrapper.textContent).toContain("Client ida");
    expect(firstP.textContent).toBe("first");
    // The server content sits inside its region element — a `display:contents`
    // frame element (layout-transparent, so visually still inline in the
    // client output), whose parent is the client wrapper.
    const region = firstP.parentElement;
    expect(region.tagName).toBe("DX-FRAME");
    expect(region.style.display).toBe("contents");
    expect(region.parentElement).toBe(wrapper);

    host.apply({ type: "html", id: "child", version: 2, html: "<p>second</p>" });

    // The client render output is not re-run: same wrapper, and the server
    // content morphed in place (same <p> element, new text).
    expect(boundary.querySelector("section > div")).toBe(wrapper);
    expect(wrapper.querySelector("p")).toBe(firstP);
    expect(firstP.textContent).toBe("second");
    expect(wrapper.textContent).toContain("Client ida");
  });

  it("an occluded region binds detached and fills before the wrapper places it", () => {
    // The occlusion case (a collapsed wrapper that doesn't render its region):
    // the region element is created when args resolve but is never placed, so
    // it must bind and fill off-DOM from the streamed chunk — then reveal in
    // place when the wrapper finally inserts the single node. A bare element
    // has no parentNode, so binding cannot gate on placement.
    const host = createFrameHost(createMockSerializer());
    let region;
    createFrame(boundary, {
      id: "f",
      host,
      slots: {
        // Capture the region element but DON'T place it (wrapper "collapsed").
        row: props => {
          region = props.children;
          return document.createElement("span");
        }
      }
    });
    host.apply({
      type: "html",
      id: "f",
      version: 1,
      html: "<div><!--slot:row#0:start--><!--slot:row#0:end--></div>"
    });
    host.apply({
      type: "slot",
      id: "f",
      version: 1,
      key: "row#0",
      args: { children: { $frame: "f.row#0.children" } }
    });
    // The region is a detached, empty element — never placed by the wrapper.
    expect(region.tagName).toBe("DX-FRAME");
    expect(region.parentNode).toBe(null);
    // Its content streams in and fills the detached element (bound off-DOM).
    host.apply({ type: "html", id: "f.row#0.children", version: 1, html: "<p>body</p>" });
    expect(region.innerHTML).toBe("<p>body</p>");
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
      html: "<section><!--slot:children:start--><!--slot:children:end--></section>"
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
      html: "<p><!--slot:label:start--><!--slot:label:end--></p>"
    });
    expect(boundary.innerHTML).toBe(
      "<p><!--slot:label:start--><b>...</b><!--slot:label:end--></p>"
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
      "<p><!--slot:label:start--><b>Hi ida</b><!--slot:label:end--></p>"
    );
  });
});

describe("live slot props (ctx.onUpdate)", () => {
  it("an args change pushes re-resolved props into the updater instead of re-calling", () => {
    const host = createFrameHost(createMockSerializer());
    let calls = 0;
    let updates = [];
    let region;
    createFrame(boundary, {
      id: "outer",
      host,
      slots: {
        children: (props, ctx) => {
          calls++;
          region = props.children;
          ctx.onUpdate(next => updates.push(next));
          const el = document.createElement("div");
          el.append("Hello ", props.name, " ");
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
      args: { name: host.serialize("ida"), children: { $frame: "child" } }
    });
    host.apply({
      type: "html",
      id: "outer",
      version: 1,
      html: "<section><!--slot:children:start--><!--slot:children:end--></section>"
    });
    host.apply({ type: "html", id: "child", version: 1, html: "<p>content</p>" });
    expect(calls).toBe(1);
    const mounted = boundary.querySelector("section div");
    const p = boundary.querySelector("section p");

    // Args change -> NO re-call; the updater receives the re-resolved props,
    // with the cached region element (same instance) threaded through.
    host.apply({
      type: "slot",
      id: "outer",
      version: 1,
      key: "children",
      args: { name: host.serialize("ada"), children: { $frame: "child" } }
    });
    expect(calls).toBe(1);
    expect(updates.length).toBe(1);
    expect(updates[0].name).toBe("ada");
    expect(updates[0].children).toBe(region);
    // The mount's DOM (frozen by the binding at invoke time) is untouched —
    // reflecting the new props is the BINDING's job through its live reads.
    expect(boundary.querySelector("section div")).toBe(mounted);
    expect(boundary.textContent).toContain("Hello ida");

    // The region's frame stayed live through the update: later chunks land.
    host.apply({ type: "html", id: "child", version: 2, html: "<p>updated</p>" });
    expect(boundary.querySelector("section p")).toBe(p);
    expect(p.textContent).toBe("updated");
  });

  it("a value-identical re-send does not fire the updater", () => {
    const host = createFrameHost(createMockSerializer());
    let calls = 0;
    let updates = 0;
    createFrame(boundary, {
      id: "f",
      host,
      slots: {
        label: (props, ctx) => {
          calls++;
          ctx.onUpdate(() => updates++);
          const b = document.createElement("b");
          b.textContent = props.text;
          return b;
        }
      }
    });
    // Record first, then the range: the mount resolves props from the record.
    host.apply({
      type: "slot",
      id: "f",
      version: 1,
      key: "label",
      args: { text: host.serialize("ida") }
    });
    host.apply({
      type: "html",
      id: "f",
      version: 1,
      html: "<p><!--slot:label:start--><!--slot:label:end--></p>"
    });
    expect(calls).toBe(1);
    // Same values, new record (tables rotate per response): the unchanged
    // fast path adopts the record — no re-call AND no update.
    host.apply({
      type: "slot",
      id: "f",
      version: 1,
      key: "label",
      args: { text: host.serialize("ida") }
    });
    expect(calls).toBe(1);
    expect(updates).toBe(0);
  });

  it("region wire renames flow through the update path, and chunks reach the live region", () => {
    const host = createFrameHost(createMockSerializer());
    let region;
    let updates = [];
    createFrame(boundary, {
      id: "outer",
      host,
      slots: {
        row: (props, ctx) => {
          region = props.children;
          ctx.onUpdate(next => updates.push(next));
          const el = document.createElement("div");
          el.append(props.children);
          return el;
        }
      }
    });
    host.apply({
      type: "slot",
      id: "outer",
      version: 1,
      key: "row#0",
      args: { n: host.serialize(1), children: { $frame: "a.row#0.children" } }
    });
    host.apply({
      type: "html",
      id: "outer",
      version: 1,
      html: "<ul><!--slot:row#0:start--><!--slot:row#0:end--></ul>"
    });
    host.apply({ type: "html", id: "a.row#0.children", version: 1, html: "<p>one</p>" });
    const p = boundary.querySelector("p");
    expect(p.textContent).toBe("one");

    // A later stream changes an arg AND addresses the region by a new wire
    // name: the update path renames (rebinds) rather than recreating.
    host.apply({
      type: "slot",
      id: "outer",
      version: 1,
      key: "row#0",
      args: { n: host.serialize(2), children: { $frame: "b.row#0.children" } }
    });
    expect(updates.length).toBe(1);
    expect(updates[0].n).toBe(2);
    expect(updates[0].children).toBe(region);
    host.apply({ type: "html", id: "b.row#0.children", version: 1, html: "<p>two</p>" });
    expect(boundary.querySelector("p")).toBe(p);
    expect(p.textContent).toBe("two");
  });

  it("unmount clears the updater; a returning occurrence re-invokes fresh", () => {
    const host = createFrameHost(createMockSerializer());
    let calls = 0;
    let updates = 0;
    createFrame(boundary, {
      id: "f",
      host,
      slots: {
        label: (props, ctx) => {
          calls++;
          ctx.onUpdate(() => updates++);
          const b = document.createElement("b");
          b.textContent = props.text;
          return b;
        }
      }
    });
    host.apply({
      type: "slot",
      id: "f",
      version: 1,
      key: "label",
      args: { text: host.serialize("a") }
    });
    host.apply({
      type: "html",
      id: "f",
      version: 1,
      html: "<p><!--slot:label:start--><!--slot:label:end--></p>"
    });
    expect(calls).toBe(1);

    // The occurrence leaves the server content -> unmount purges the updater.
    host.apply({ type: "html", id: "f", version: 2, html: "<p></p>" });
    // It returns with different args: a fresh mount invocation resolving the
    // new record, not a push into the disposed binding.
    host.apply({
      type: "slot",
      id: "f",
      version: 3,
      key: "label",
      args: { text: host.serialize("b") }
    });
    host.apply({
      type: "html",
      id: "f",
      version: 3,
      html: "<p><!--slot:label:start--><!--slot:label:end--></p>"
    });
    expect(calls).toBe(2);
    expect(updates).toBe(0);
    expect(boundary.querySelector("b").textContent).toBe("b");
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
      (_, i) => `<!--slot:comment#${i}:start--><!--slot:comment#${i}:end-->`
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
      ids.map(i => `<!--slot:comment#${i}:start--><!--slot:comment#${i}:end-->`).join("") +
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
      html: "<ul><!--slot:comment#0:start--><!--slot:comment#0:end--></ul>"
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
      html: "<div>body<!--slot:comment#0:start--><!--slot:comment#0:end--></div>"
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
  const projRange = id => `<!--slot:${id}:start--><!--slot:${id}:end-->`;

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
    "<!--slot:children:start--><button>0</button><!--slot:children:end-->" +
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
      "<article><h1>Story</h1><!--slot:children:start--><input><!--slot:children:end--></article>"
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
            "<!--slot:children:start--><!--slot:children:end-->" +
            "</article>"
        )
      }
    });
    expect(boundary.querySelector("h1").textContent).toBe("Story updated");
    expect(boundary.querySelector("button")).toBe(ssrButton);
    expect(ssrButton.dataset.bound).toBe("yes");
  });

  it("mounts fresh (empty-range) slots identically to before through the replace path", () => {
    boundary.innerHTML = "<div><!--slot:children:start--><!--slot:children:end--></div>";
    const el = document.createElement("span");
    el.textContent = "new";
    createFrame(boundary, { adopt: true, slots: { children: () => el } });
    expect(boundary.innerHTML).toBe(
      "<div><!--slot:children:start--><span>new</span><!--slot:children:end--></div>"
    );
  });
});

describe("adoption -> first morph with nested regions (#547)", () => {
  const adoptedDom =
    "<article><h1>Row</h1>" +
    "<!--slot:row#r1:start-->" +
    '<div class="row"><button>[-]</button>' +
    '<dx-frame data-fid="f.row#r1.children" style="display:contents"><em>body-1</em></dx-frame>' +
    "</div>" +
    "<!--slot:row#r1:end-->" +
    "</article>";
  const streamHtml =
    "<article><h1>Row v2</h1><!--slot:row#r1:start--><!--slot:row#r1:end--></article>";

  it("threads a used region's EXISTING element into the wrapper's props at t=0 (client reactivity must own it)", () => {
    // A used region is omitted from the t=0 record (it shipped as page
    // markup), so a record-less adopt must still hand the wrapper the
    // already-rendered region element as `props.children` — otherwise the
    // wrapper's own conditional never owns it, and a client-only toggle that
    // conditionally renders it can't hide/show it until a stream re-call
    // (which is why the HN global-collapse toggle failed at t=0 but worked
    // after navigation).
    boundary.innerHTML = adoptedDom;
    const host = createFrameHost(createMockSerializer());
    let received;
    createFrame(boundary, {
      id: "f",
      host,
      adopt: true,
      slots: {
        row: props => {
          received = props.children;
          return undefined; // claim in place
        }
      }
    });
    const existing = boundary.querySelector('dx-frame[data-fid="f.row#r1.children"]');
    expect(existing).toBeTruthy();
    expect(received).toBe(existing);
  });

  it("an ARMED adopted occurrence (t=0 record drained pre-adoption) does not re-call when the stream adds its used region as {$frame}; the region morphs in place", () => {
    boundary.innerHTML = adoptedDom;
    const host = createFrameHost(createMockSerializer());
    // The documentBoundary drain: the t=0 record (used regions omitted by
    // design) applies BEFORE the frame binds; the host buffers it.
    host.apply({ type: "slot", id: "f", version: 0, key: "row#r1", args: { cid: "r1" } });
    const calls = [];
    createFrame(boundary, {
      id: "f",
      host,
      adopt: true,
      slots: {
        row: (props, ctx) => {
          calls.push({ cid: props.cid, adopted: ctx.adopted });
          return undefined; // claim
        }
      }
    });
    expect(calls).toEqual([{ cid: "r1", adopted: true }]);
    const em = boundary.querySelector("em");

    // First post-boot stream: same cid, plus the used region as {$frame}.
    host.apply({ type: "html", id: "f", version: 2, html: streamHtml });
    host.apply({
      type: "slot",
      id: "f",
      version: 2,
      key: "row#r1",
      args: { cid: "r1", children: { $frame: "f.row#r1.children" } }
    });
    // No re-call, wrapper and region intact, server content morphed.
    expect(calls.length).toBe(1);
    expect(boundary.querySelector("h1").textContent).toBe("Row v2");
    expect(boundary.querySelector("em")).toBe(em);
    expect(em.textContent).toBe("body-1");

    // The region's own stream morphs its interior in place.
    host.apply({ type: "html", id: "f.row#r1.children", version: 2, html: "<em>body-2</em>" });
    expect(boundary.querySelector("em").textContent).toBe("body-2");
    expect(boundary.querySelector(".row button")).toBeTruthy();
  });

  it("a multi-record drain applies as ONE write: every occurrence mounts armed exactly once (#547 boot face)", () => {
    // Per-chunk register-flush applies would mount ALL occurrences on the
    // first record's sync — the rest record-less — then re-call them as
    // each later record landed, rendering with incomplete args and wiping
    // adopted interiors.
    boundary.innerHTML =
      "<div>" +
      "<!--slot:row#r1:start--><b>one</b><!--slot:row#r1:end-->" +
      "<!--slot:row#r2:start--><b>two</b><!--slot:row#r2:end-->" +
      "</div>";
    const host = createFrameHost(createMockSerializer());
    host.apply({ type: "slot", id: "f", version: 0, key: "row#r1", args: { cid: "r1" } });
    host.apply({ type: "slot", id: "f", version: 0, key: "row#r2", args: { cid: "r2" } });
    const calls = [];
    createFrame(boundary, {
      id: "f",
      host,
      adopt: true,
      slots: {
        row: (props, ctx) => {
          calls.push([props.cid, ctx.adopted]);
          return undefined;
        }
      }
    });
    expect(calls.sort()).toEqual([
      ["r1", true],
      ["r2", true]
    ]);
    // The adopted interiors are untouched.
    expect(boundary.querySelectorAll("b").length).toBe(2);
  });

  it("a RECORD-LESS adopted occurrence treats a first record of only known {$frame} regions as unchanged", () => {
    boundary.innerHTML = adoptedDom;
    const host = createFrameHost(createMockSerializer());
    const calls = [];
    createFrame(boundary, {
      id: "f",
      host,
      adopt: true,
      slots: {
        row: (props, ctx) => {
          calls.push(ctx.adopted);
          return undefined;
        }
      }
    });
    expect(calls).toEqual([true]);
    host.apply({
      type: "slot",
      id: "f",
      version: 2,
      key: "row#r1",
      args: { children: { $frame: "f.row#r1.children" } }
    });
    expect(calls.length).toBe(1);
    expect(boundary.querySelector("em").textContent).toBe("body-1");
  });

  it("a GENUINE arg change re-calls as a real render (ctx.adopted unset) and the moved region re-places", () => {
    boundary.innerHTML = adoptedDom;
    const host = createFrameHost(createMockSerializer());
    host.apply({ type: "slot", id: "f", version: 0, key: "row#r1", args: { cid: "r1" } });
    const calls = [];
    createFrame(boundary, {
      id: "f",
      host,
      adopt: true,
      slots: {
        row: (props, ctx) => {
          calls.push({ cid: props.cid, adopted: ctx.adopted });
          if (ctx.adopted) return undefined; // claim at attach
          // Real re-render: place the region fragment inside fresh output.
          const div = document.createElement("div");
          div.className = "row fresh";
          div.append(props.children);
          return div;
        }
      }
    });
    host.apply({
      type: "slot",
      id: "f",
      version: 2,
      key: "row#r1",
      args: { cid: "r2", children: { $frame: "f.row#r1.children" } }
    });
    expect(calls.length).toBe(2);
    expect(calls[1]).toEqual({ cid: "r2", adopted: false });
    // The fresh output holds the region range — nothing dropped.
    const fresh = boundary.querySelector(".row.fresh");
    expect(fresh).toBeTruthy();
    expect(fresh.querySelector("em").textContent).toBe("body-1");
    // And the region still morphs after the re-place.
    host.apply({ type: "html", id: "f.row#r1.children", version: 2, html: "<em>body-3</em>" });
    expect(fresh.querySelector("em").textContent).toBe("body-3");
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
      html: "<section>Comment<!--slot:reply:start--><!--slot:reply:end--></section>"
    });
    host.apply({
      type: "html",
      id: "outer",
      version: 1,
      html: "<article><h1>Post</h1><!--slot:children:start--><!--slot:children:end--></article>"
    });

    expect(boundary.querySelector("article > h1").textContent).toBe("Post");
    expect(boundary.querySelector("section").textContent).toContain("Comment");
    expect(replyButton.isConnected).toBe(true);

    // Address a later update straight to the nested frame; client button survives.
    host.apply({
      type: "html",
      id: "inner",
      version: 2,
      html: "<section>EDITED<!--slot:reply:start--><!--slot:reply:end--></section>"
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
      html: "<article><!--slot:children:start--><!--slot:children:end--></article>"
    });
    host.apply({
      type: "html",
      id: "inner",
      version: 1,
      html: "<section>c<!--slot:reply:start--><!--slot:reply:end--></section>"
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

describe("boundary retention across unmounts", () => {
  // Boundary identity outlives any one mount: an integration's cache can
  // resolve a call with the same component and NO new stream (a fresh query
  // cache hit on back-navigation), so the host retains the last frame's
  // snapshot and seeds the next mount from it — otherwise the remounted
  // boundary rendered blank until something refetched.
  it("re-materializes a streamed boundary on remount with no new chunks", () => {
    const host = createFrameHost(createMockSerializer());
    const first = document.createElement("div");
    document.body.appendChild(first);
    const frame = createFrame(first, { id: "back", host });
    host.apply({ type: "html", id: "back", version: 1, html: "<p>top stories</p>" });
    expect(first.innerHTML).toBe("<p>top stories</p>");

    frame.dispose();
    first.remove();

    const second = document.createElement("div");
    document.body.appendChild(second);
    createFrame(second, { id: "back", host });
    expect(second.innerHTML).toBe("<p>top stories</p>");
  });

  it("retained slot records re-invoke on remount (the dispose scrub does not reach the snapshot)", () => {
    const host = createFrameHost(createMockSerializer());
    const calls = [];
    const slots = {
      cta: props => {
        calls.push(props.label);
        const b = document.createElement("button");
        b.textContent = props.label;
        return b;
      }
    };
    const first = document.createElement("div");
    document.body.appendChild(first);
    const frame = createFrame(first, { id: "slotted", host, slots });
    // Record before range so the mount invokes once, with args.
    host.apply({ type: "slot", id: "slotted", version: 1, key: "cta", args: { label: "go" } });
    host.apply({
      type: "html",
      id: "slotted",
      version: 1,
      html: "<div><!--slot:cta:start--><!--slot:cta:end--></div>"
    });
    expect(first.querySelector("button").textContent).toBe("go");
    expect(calls).toEqual(["go"]);

    frame.dispose();
    first.remove();

    const second = document.createElement("div");
    document.body.appendChild(second);
    createFrame(second, { id: "slotted", host, slots });
    expect(second.querySelector("button").textContent).toBe("go");
    expect(calls).toEqual(["go", "go"]);
  });

  it("snapshots an adopted boundary's interior when its markup never traveled as chunks", () => {
    const host = createFrameHost(createMockSerializer());
    const el = document.createElement("div");
    el.innerHTML = "<p>document ssr</p>";
    document.body.appendChild(el);
    const frame = createFrame(el, { id: "doc", host, adopt: true });
    frame.dispose();
    el.remove();

    const second = document.createElement("div");
    document.body.appendChild(second);
    createFrame(second, { id: "doc", host });
    expect(second.innerHTML).toBe("<p>document ssr</p>");
  });

  it("a newer buffered stream morphs over the retained state on remount", () => {
    const host = createFrameHost(createMockSerializer());
    const first = document.createElement("div");
    document.body.appendChild(first);
    const frame = createFrame(first, { id: "fresh", host });
    host.apply({ type: "html", id: "fresh", version: 1, html: "<p>old</p>" });
    frame.dispose();

    // A refetch's stream arrives while nothing is mounted (buffered).
    host.apply({ type: "html", id: "fresh", version: 2, html: "<p>new</p>" });

    const second = document.createElement("div");
    document.body.appendChild(second);
    createFrame(second, { id: "fresh", host });
    expect(second.innerHTML).toBe("<p>new</p>");
  });

  it("retention is consumed by the mount and re-stashed on its unmount", () => {
    const host = createFrameHost(createMockSerializer());
    const first = document.createElement("div");
    document.body.appendChild(first);
    const a = createFrame(first, { id: "cycle", host });
    host.apply({ type: "html", id: "cycle", version: 1, html: "<p>one</p>" });
    a.dispose();

    const second = document.createElement("div");
    document.body.appendChild(second);
    const b = createFrame(second, { id: "cycle", host });
    expect(second.innerHTML).toBe("<p>one</p>");
    host.apply({ type: "html", id: "cycle", version: 2, html: "<p>two</p>" });
    b.dispose();

    const third = document.createElement("div");
    document.body.appendChild(third);
    createFrame(third, { id: "cycle", host });
    expect(third.innerHTML).toBe("<p>two</p>");
  });
});

describe("segment state across versions", () => {
  it("a new version's same-named segment reveals fresh: no stale content, no stuck fallback", () => {
    const host = createFrameHost(createMockSerializer());
    const el = document.createElement("div");
    document.body.appendChild(el);
    createFrame(el, { id: "nav", host });

    // v1: shell + async fragment, revealed.
    host.apply({
      type: "html",
      id: "nav",
      version: 1,
      html: `<article><h1>One</h1>${ph("0")}</article>`
    });
    host.apply({ type: "fragment", id: "nav", version: 1, key: "0", html: "<p>one-comments</p>" });
    host.apply({ type: "reveal", id: "nav", version: 1, keys: ["0"] });
    expect(el.textContent).toBe("Oneone-comments");

    // v2 shell arrives with ITS OWN pl-0 placeholder. The old version's
    // reveal state must not leak: neither instantly revealing v1's fragment
    // into it, nor skipping the segment so the fallback sticks forever.
    host.apply({
      type: "html",
      id: "nav",
      version: 2,
      html: `<article><h1>Two</h1>${ph("0")}</article>`
    });
    expect(el.textContent).toBe("Two");
    expect(el.innerHTML).toContain("pl-0");
    expect(el.innerHTML).not.toContain("one-comments");

    // v2's own fragment reveals normally.
    host.apply({ type: "fragment", id: "nav", version: 2, key: "0", html: "<p>two-comments</p>" });
    host.apply({ type: "reveal", id: "nav", version: 2, keys: ["0"] });
    expect(el.textContent).toBe("Twotwo-comments");
    expect(el.innerHTML).not.toContain("pl-0");
    el.remove();
  });
});

describe("morph lookahead", () => {
  it("relocates a same-tag element past churned content, client interior intact", () => {
    const host = createFrameHost(createMockSerializer());
    const el = document.createElement("div");
    document.body.appendChild(el);
    const badge = document.createElement("input");
    createFrame(el, { id: "la", host, slots: { children: () => badge } });

    // v1: revealed content sits between the meta and the footer.
    host.apply({
      type: "html",
      id: "la",
      version: 1,
      html:
        "<article><h1>One</h1><section>revealed</section>" +
        "<footer><!--slot:children:start--><!--slot:children:end--></footer></article>"
    });
    const footer = el.querySelector("footer");
    expect(el.querySelector("footer input")).toBe(badge);
    badge.dataset.draft = "typed";

    // v2: a placeholder + fallback where the section was — the footer moved
    // positions. The morph must pair footer-to-footer across the churn, not
    // recreate it (which would destroy the client-owned draft inside).
    host.apply({
      type: "html",
      id: "la",
      version: 2,
      html:
        `<article><h1>Two</h1>${ph("0")}` +
        "<footer><!--slot:children:start--><!--slot:children:end--></footer></article>"
    });
    expect(el.querySelector("h1").textContent).toBe("Two");
    expect(el.querySelector("footer")).toBe(footer);
    expect(el.querySelector("footer input")).toBe(badge);
    expect(badge.dataset.draft).toBe("typed");
    el.remove();
  });
});

describe("multi-mount fan-out and late-mount seeding", () => {
  let a, b;
  beforeEach(() => {
    a = document.createElement("div");
    b = document.createElement("div");
    document.body.append(a, b);
  });
  afterEach(() => {
    a.remove();
    b.remove();
  });

  it("fans chunks out to every frame registered under an id", () => {
    const host = createFrameHost(createMockSerializer());
    const badgeA = document.createElement("button");
    const badgeB = document.createElement("button");
    createFrame(a, { id: "m", host, slots: { children: () => badgeA } });
    createFrame(b, { id: "m", host, slots: { children: () => badgeB } });

    host.apply({
      type: "html",
      id: "m",
      version: 1,
      html: "<p>hi<!--slot:children:start--><!--slot:children:end--></p>"
    });

    // Same server content in both instances, each with its own client slot.
    expect(a.querySelector("p")).toBeTruthy();
    expect(b.querySelector("p")).toBeTruthy();
    expect(a.contains(badgeA)).toBe(true);
    expect(b.contains(badgeB)).toBe(true);
  });

  it("seeds a late-mounting sibling from an existing frame's store", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(a, { id: "m", host });
    host.apply({ type: "html", id: "m", version: 2, html: "<p>content</p>" });
    expect(a.innerHTML).toBe("<p>content</p>");

    // Mounts AFTER the stream was delivered and its pending buffer drained:
    // seeded from the sibling's store, not left empty.
    const late = document.createElement("badge-late");
    createFrame(b, {
      id: "m",
      host,
      slots: { children: () => late }
    });
    expect(b.innerHTML).toBe("<p>content</p>");

    // The seeded instance participates in future fan-out at the same version.
    host.apply({ type: "html", id: "m", version: 3, html: "<p>updated</p>" });
    expect(a.innerHTML).toBe("<p>updated</p>");
    expect(b.innerHTML).toBe("<p>updated</p>");
  });

  it("unregisters per frame: disposing one instance keeps the others live", () => {
    const host = createFrameHost(createMockSerializer());
    const fa = createFrame(a, { id: "m", host });
    createFrame(b, { id: "m", host });
    host.apply({ type: "html", id: "m", version: 1, html: "<p>one</p>" });

    fa.dispose();
    host.apply({ type: "html", id: "m", version: 2, html: "<p>two</p>" });
    expect(a.innerHTML).toBe("<p>one</p>");
    expect(b.innerHTML).toBe("<p>two</p>");
    expect(host.get("m")).toBeDefined();
  });
});

describe("frame:applied document notification", () => {
  let el, events, listener;
  beforeEach(() => {
    el = document.createElement("div");
    document.body.appendChild(el);
    events = [];
    listener = e => events.push({ target: e.target, ...e.detail });
    document.addEventListener(FRAME_APPLIED_EVENT, listener);
  });
  afterEach(() => {
    document.removeEventListener(FRAME_APPLIED_EVENT, listener);
    el.remove();
  });

  it("dispatches bubbling events for materialize, morph, and reveal", () => {
    const host = createFrameHost(createMockSerializer());
    createFrame(el, { id: "n", host });

    host.apply({ type: "html", id: "n", version: 1, html: `<div>a${ph("p1")}</div>` });
    expect(events).toEqual([{ target: el, id: "n", version: 1, reason: "materialize" }]);

    host.apply({ type: "fragment", id: "n", version: 1, key: "p1", html: "<i>late</i>" });
    host.apply({ type: "reveal", id: "n", version: 1, keys: ["p1"] });
    expect(events[1]).toEqual({ target: el, id: "n", version: 1, reason: "reveal" });

    host.apply({ type: "html", id: "n", version: 2, html: "<div>b</div>" });
    expect(events[2]).toEqual({ target: el, id: "n", version: 2, reason: "morph" });
    expect(events).toHaveLength(3);
  });
});

describe("call-site handoff (rebind)", () => {
  // A live call site switching arguments must not remount: the reader keeps
  // its component, and the mounted frame REBINDS to the new call's id — the
  // element and its keyed slot state stay while the new id's stream (or
  // retained state) morphs in place. This is the notes-demo search: filtering
  // the sidebar list must not collapse notes still in view.
  it("rebind keeps the element and keyed slot state; the new id's buffered stream morphs in place", () => {
    const host = createFrameHost(createMockSerializer());
    const calls = [];
    const outputs = new Map();
    const slots = {
      item: (props, ctx) => {
        calls.push(ctx.key);
        const b = document.createElement("b");
        b.textContent = props.title;
        outputs.set(ctx.key, b);
        return b;
      }
    };
    const el = document.createElement("div");
    document.body.appendChild(el);
    const frame = createFrame(el, { id: "list:all", host, slots });
    host.apply({
      type: "slot",
      id: "list:all",
      version: 1,
      key: "item#1",
      args: { title: "Meeting Notes" }
    });
    host.apply({
      type: "slot",
      id: "list:all",
      version: 1,
      key: "item#2",
      args: { title: "Groceries" }
    });
    host.apply({
      type: "html",
      id: "list:all",
      version: 1,
      html:
        "<ul><li><!--slot:item#1:start--><!--slot:item#1:end--></li>" +
        "<li><!--slot:item#2:start--><!--slot:item#2:end--></li></ul>"
    });
    const kept = outputs.get("item#1");
    expect(calls).toEqual(["item#1", "item#2"]);
    // Live client state inside the kept occurrence's output.
    kept.dataset.expanded = "true";

    // The filtered call's stream arrives first (buffered — nothing shows that
    // id yet), then the mount rebinds to it.
    host.apply({
      type: "slot",
      id: "list:me",
      version: 1,
      key: "item#1",
      args: { title: "Meeting Notes" }
    });
    host.apply({
      type: "html",
      id: "list:me",
      version: 1,
      html: "<ul><li><!--slot:item#1:start--><!--slot:item#1:end--></li></ul>"
    });
    frame.rebind("list:me");

    // Same element, same live occurrence output (state intact), no re-invoke
    // for the value-equal record; the filtered-out occurrence unmounted.
    expect(host.get("list:me")).toBe(frame);
    expect(host.get("list:all")).toBeUndefined();
    expect(el.querySelector("b")).toBe(kept);
    expect(kept.dataset.expanded).toBe("true");
    expect(calls).toEqual(["item#1", "item#2"]);
    expect(el.querySelectorAll("li").length).toBe(1);
  });

  it("leaving an id stashes retention under it; joining seeds from the new id's retained store", () => {
    const host = createFrameHost(createMockSerializer());
    // An earlier mount of the target call retained its state...
    const before = document.createElement("div");
    document.body.appendChild(before);
    const earlier = createFrame(before, { id: "feed:new", host });
    host.apply({ type: "html", id: "feed:new", version: 3, html: "<p>new stories</p>" });
    earlier.dispose();
    before.remove();

    // ...and the live mount showing another call rebinds to it (a cache hit
    // — no stream follows).
    const el = document.createElement("div");
    document.body.appendChild(el);
    const frame = createFrame(el, { id: "feed:top", host });
    host.apply({ type: "html", id: "feed:top", version: 1, html: "<p>top stories</p>" });
    frame.rebind("feed:new");
    expect(el.innerHTML).toBe("<p>new stories</p>");

    // The call it left re-materializes for a later mount, honesty intact.
    const other = document.createElement("div");
    document.body.appendChild(other);
    createFrame(other, { id: "feed:top", host });
    expect(other.innerHTML).toBe("<p>top stories</p>");
  });

  it("rebased seeding: a retained snapshot's higher version cannot stale-drop the new space's stream", () => {
    const host = createFrameHost(createMockSerializer());
    const el = document.createElement("div");
    document.body.appendChild(el);
    const frame = createFrame(el, { id: "a", host });
    // Several streams into `a` push its numbering past the target's counter.
    host.apply({ type: "html", id: "a", version: 5, html: "<p>a5</p>" });
    frame.rebind("b");
    // The new space's FIRST stream is version 1 — smaller than the carried
    // store's number, but a different space entirely. It must land.
    host.apply({ type: "html", id: "b", version: 1, html: "<p>b1</p>" });
    expect(el.innerHTML).toBe("<p>b1</p>");
  });

  it("region wire names follow a re-sent record without re-calling, and chunks reach the live region", () => {
    // Region identity is (occurrence, arg); the `$frame` childId is a
    // per-stream wire name — the document and direct responses prefix it
    // with the function id, a single-flight region with the call's address.
    // A record differing only in that prefix must keep the occurrence (no
    // re-call, client state intact) while the bound region frame REBINDS to
    // the new name so the incoming stream's content reaches it.
    const host = createFrameHost(createMockSerializer());
    const calls = [];
    const el = document.createElement("div");
    document.body.appendChild(el);
    createFrame(el, {
      id: "fn",
      host,
      slots: {
        item: props => {
          calls.push(props.title);
          const div = document.createElement("div");
          div.append(props.title, " ", props.children);
          return div;
        }
      }
    });
    host.apply({
      type: "slot",
      id: "fn",
      version: 1,
      key: "item#1",
      args: { title: host.serialize("Meeting Notes"), children: { $frame: "fn.item#1.children" } }
    });
    host.apply({
      type: "html",
      id: "fn",
      version: 1,
      html: "<ul><li><!--slot:item#1:start--><!--slot:item#1:end--></li></ul>"
    });
    host.apply({ type: "html", id: "fn.item#1.children", version: 1, html: "<p>excerpt</p>" });
    const wrapper = el.querySelector("li > div");
    const p = wrapper.querySelector("p");
    expect(calls).toEqual(["Meeting Notes"]);

    // A mutation's flight region re-sends the record under its address-
    // prefixed names, value-equal otherwise.
    host.apply({
      type: "slot",
      id: "fn",
      version: 2,
      key: "item#1",
      args: {
        title: host.serialize("Meeting Notes"),
        children: { $frame: "fn:123.item#1.children" }
      }
    });
    host.apply({
      type: "html",
      id: "fn",
      version: 2,
      html: "<ul><li><!--slot:item#1:start--><!--slot:item#1:end--></li></ul>"
    });
    // No re-call — the wrapper (and everything live inside it) survived.
    expect(calls).toEqual(["Meeting Notes"]);
    expect(el.querySelector("li > div")).toBe(wrapper);

    // The region followed the rename: the new wire name's chunks morph its
    // live element in place.
    host.apply({ type: "html", id: "fn:123.item#1.children", version: 1, html: "<p>fresh</p>" });
    expect(wrapper.querySelector("p")).toBe(p);
    expect(p.textContent).toBe("fresh");
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
