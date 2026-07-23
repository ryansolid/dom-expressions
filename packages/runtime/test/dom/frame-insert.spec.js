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

  it("honors `as` for a semantic/parsing-context tag (no display override)", () => {
    const host = createFrameHost();
    const { element, dispose } = createFrameElement({ host, id: "rows", as: "tbody" });
    expect(element.tagName).toBe("TBODY");
    // The author owns display for an `as` element — no contents override.
    expect(element.style.display).toBe("");
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
});
