/**
 * @jest-environment jsdom
 */
// The frame boundary is an ELEMENT (`createFrameElement`), not a branded
// insertable range. A frame mounts INTO the element; the element is a plain
// node, so `insert` places it natively in any position — single, array, or
// fragment — with no brand and no special path in client.js. This is what
// closes #550 (frame in an array/fragment position crashing insertBefore):
// there is nothing left to special-case.
import * as r from "../../src/client";
import { createRoot } from "@solidjs/signals";
import { createFrameElement, createFrameHost, FRAME_TAG } from "../../src/frame-client";

describe("frame boundary element", () => {
  let container;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => container.remove());

  it("mounts as an element and streams content into it by host id", () => {
    const host = createFrameHost();
    const { element, dispose } = createFrameElement({ host, id: "f1" });
    createRoot(() => {
      r.insert(container, () => element, null);
    });
    // The boundary is a layout-transparent element, empty until content lands.
    const frame = container.querySelector(FRAME_TAG);
    expect(frame).not.toBe(null);
    expect(frame.style.display).toBe("contents");
    host.apply({ type: "html", id: "f1", version: 1, html: "<p>Hi</p>" });
    expect(frame.innerHTML).toBe("<p>Hi</p>");
    dispose();
  });

  it("flushes chunks buffered before the mount when the frame registers", () => {
    const host = createFrameHost();
    host.apply({ type: "html", id: "early", version: 1, html: "<span>pre</span>" });
    const { element, dispose } = createFrameElement({ host, id: "early" });
    createRoot(() => {
      r.insert(container, () => element, null);
    });
    expect(element.innerHTML).toBe("<span>pre</span>");
    dispose();
  });

  it("dispose removes the element and later chunks are ignored", () => {
    const host = createFrameHost();
    const { element, dispose, frame } = createFrameElement({ host, id: "f3" });
    createRoot(() => {
      r.insert(container, () => element, null);
    });
    host.apply({ type: "html", id: "f3", version: 1, html: "<p>live</p>" });
    dispose();
    expect(container.innerHTML).toBe("");
    // Unregistered: a later chunk buffers for a future frame instead of
    // touching the removed element.
    host.apply({ type: "html", id: "f3", version: 2, html: "<p>late</p>" });
    expect(container.innerHTML).toBe("");
    expect(element.isConnected).toBe(false);
  });

  it("policy A holds: a newer version morphs the element's content in place", () => {
    const host = createFrameHost();
    const { element, dispose } = createFrameElement({ host, id: "nav" });
    createRoot(() => {
      r.insert(container, () => element, null);
    });
    host.apply({ type: "html", id: "nav", version: 1, html: "<h1>One</h1>" });
    const h1 = element.querySelector("h1");
    host.apply({ type: "html", id: "nav", version: 2, html: "<h1>Two</h1>" });
    expect(element.querySelector("h1")).toBe(h1);
    expect(h1.textContent).toBe("Two");
    dispose();
  });

  it("an error record notifies onApply — a consumer gating on first apply releases", () => {
    // A mount holding its covering boundary open until the frame has content
    // (the shell-gate pattern) must release on a FAILED stream too: the
    // error record is an apply. Once per record — later chunks of the same
    // stream (`complete` re-runs the flush) must not re-fire — and a new
    // version re-arms.
    const applies = [];
    const host = createFrameHost();
    const { dispose } = createFrameElement({
      host,
      id: "boom",
      onApply: info => applies.push(info.reason)
    });
    host.apply({ type: "error", id: "boom", version: 1, error: { message: "nope" } });
    expect(applies).toEqual(["error"]);
    host.apply({ type: "complete", id: "boom", version: 1 });
    expect(applies).toEqual(["error"]);
    // A newer version is a fresh response: content applies normally and a
    // fresh error notifies again.
    host.apply({ type: "html", id: "boom", version: 2, html: "<p>ok</p>" });
    expect(applies).toEqual(["error", "materialize"]);
    host.apply({ type: "error", id: "boom", version: 3, error: { message: "again" } });
    expect(applies).toEqual(["error", "materialize", "error"]);
    dispose();
  });
});

// #550: a frame boundary in an array / fragment position. Under the element
// model this is not a special case at all — the element is a node like any
// other, so `insert` / `reconcileArrays` / `appendNodes` handle it. These
// are the exact shapes that crashed `insertBefore` on the branded object.
describe("frame boundary element in array / fragment positions (#550)", () => {
  let container;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => container.remove());

  const heading = text => {
    const h = document.createElement("h1");
    h.textContent = text;
    return h;
  };

  it("mounts as a trailing member of a fragment array", () => {
    const host = createFrameHost();
    const { element, dispose } = createFrameElement({ host, id: "f1" });
    createRoot(() => {
      r.insert(container, () => [heading("Server Components"), element], null);
    });
    host.apply({ type: "html", id: "f1", version: 1, html: "<p>panel</p>" });
    expect(container.querySelector("h1").textContent).toBe("Server Components");
    expect(container.querySelector("p").textContent).toBe("panel");
    dispose();
  });

  it("mounts as a leading member of a fragment array", () => {
    const host = createFrameHost();
    const { element, dispose } = createFrameElement({ host, id: "f2" });
    createRoot(() => {
      r.insert(container, () => [element, heading("After")], null);
    });
    host.apply({ type: "html", id: "f2", version: 1, html: "<p>lead</p>" });
    expect(container.querySelector("p").textContent).toBe("lead");
    expect(container.querySelector("h1").textContent).toBe("After");
    dispose();
  });

  it("mounts two frames flanking static content in one array", () => {
    const host = createFrameHost();
    const a = createFrameElement({ host, id: "a" });
    const b = createFrameElement({ host, id: "b" });
    createRoot(() => {
      r.insert(container, () => [a.element, heading("mid"), b.element], null);
    });
    host.apply({ type: "html", id: "a", version: 1, html: "<p>A</p>" });
    host.apply({ type: "html", id: "b", version: 1, html: "<p>B</p>" });
    const ps = container.querySelectorAll("p");
    expect(ps.length).toBe(2);
    expect(ps[0].textContent).toBe("A");
    expect(ps[1].textContent).toBe("B");
    expect(container.querySelector("h1").textContent).toBe("mid");
    a.dispose();
    b.dispose();
  });

  it("mounts into a marker range without disturbing siblings", () => {
    const marker = document.createComment("m");
    const sibling = document.createElement("i");
    container.append(sibling, marker);
    const host = createFrameHost();
    const { element, dispose } = createFrameElement({ host, id: "f2" });
    createRoot(() => {
      r.insert(container, () => element, marker);
    });
    host.apply({ type: "html", id: "f2", version: 1, html: "<b>x</b>" });
    expect(container.querySelector("i")).toBe(sibling);
    expect(element.innerHTML).toBe("<b>x</b>");
    // sibling, then the frame element, then the marker.
    expect(container.firstChild).toBe(sibling);
    expect(element.nextSibling).toBe(marker);
    dispose();
  });

  // Root affinity is per stream (solidjs/solid#2977 follow-up): an address
  // switch may deliver a shell byte-identical to the one on screen —
  // slot-driven content ships its differences as records, not markup — and
  // consumers gate on `onApply` to learn the new call ANSWERED. The stale
  // skip must not swallow the new stream's morph, and the interim flushes
  // must not re-apply the previous stream's root as if the new one answered.
  it("rebind re-applies an identical shell and never answers with the stale root", () => {
    const host = createFrameHost();
    const applies = [];
    const { element, dispose, frame } = createFrameElement({
      host,
      id: "addr-a",
      onApply: e => applies.push(e.reason)
    });
    createRoot(() => {
      r.insert(container, () => element, null);
    });
    const shell = "<div><h1>Shell</h1></div>";
    host.apply({ type: "html", id: "addr-a", version: 1, html: shell });
    expect(element.innerHTML).toBe(shell);
    const before = applies.length;
    frame.rebind("addr-b");
    // The old content stays on screen while the new call streams.
    expect(element.innerHTML).toBe(shell);
    // A non-root write for the new address (its start chunk) must not
    // re-apply the previous stream's root — that would answer the switch
    // with the OLD call's content.
    host.apply({ type: "start", id: "addr-b", version: 1 });
    expect(applies.length).toBe(before);
    // The new call's shell is byte-identical: it must still count as this
    // address's apply (before the fix, the value-skip starved onApply and
    // a switch gate waiting on it held forever).
    host.apply({ type: "html", id: "addr-b", version: 1, html: shell });
    expect(applies.length).toBe(before + 1);
    expect(element.innerHTML).toBe(shell);
    dispose();
  });
});
