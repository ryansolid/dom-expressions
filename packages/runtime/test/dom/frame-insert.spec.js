/**
 * @jest-environment jsdom
 */
// The frame insert brand: client.js's `insert` recognizes a branded
// frame-insertable value ($$FRAME, a registered symbol) and delegates the
// mount to the handler the value carries — client.js never imports the frame
// runtime, so apps that don't use frames pay zero bytes for them.
import * as r from "../../src/client";
import { createRoot } from "@solidjs/signals";
import { createFrameInsertable, createFrameHost } from "../../src/frame-client";

describe("insert with a branded frame value", () => {
  let container;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => container.remove());

  it("mounts a comment range and streams content into it by host id", () => {
    const host = createFrameHost();
    const value = createFrameInsertable({ host, id: "f1" });
    createRoot(() => {
      r.insert(container, value);
    });
    expect(container.innerHTML).toBe("<!--frame:start--><!--frame:end-->");
    host.apply({ type: "html", id: "f1", version: 1, html: "<p>Hi</p>" });
    expect(container.innerHTML).toBe("<!--frame:start--><p>Hi</p><!--frame:end-->");
    value.dispose();
  });

  it("flushes chunks buffered before the mount when the frame registers", () => {
    const host = createFrameHost();
    host.apply({ type: "html", id: "early", version: 1, html: "<span>pre</span>" });
    const value = createFrameInsertable({ host, id: "early" });
    createRoot(() => {
      r.insert(container, value);
    });
    expect(container.innerHTML).toBe("<!--frame:start--><span>pre</span><!--frame:end-->");
    value.dispose();
  });

  it("mounts into a marker range without disturbing siblings", () => {
    const marker = document.createComment("m");
    const sibling = document.createElement("i");
    container.append(sibling, marker);
    const host = createFrameHost();
    const value = createFrameInsertable({ host, id: "f2" });
    createRoot(() => {
      r.insert(container, value, marker);
    });
    host.apply({ type: "html", id: "f2", version: 1, html: "<b>x</b>" });
    expect(container.innerHTML).toBe(
      "<i></i><!--frame:start--><b>x</b><!--frame:end--><!--m-->"
    );
    expect(container.querySelector("i")).toBe(sibling);
    value.dispose();
  });

  it("dispose removes the range and later chunks are ignored", () => {
    const host = createFrameHost();
    const value = createFrameInsertable({ host, id: "f3" });
    createRoot(() => {
      r.insert(container, value);
    });
    host.apply({ type: "html", id: "f3", version: 1, html: "<p>live</p>" });
    value.dispose();
    expect(container.innerHTML).toBe("");
    // Unregistered: a later chunk buffers for a future frame instead of
    // touching the removed range.
    host.apply({ type: "html", id: "f3", version: 2, html: "<p>late</p>" });
    expect(container.innerHTML).toBe("");
    expect(value.frame).toBe(null);
  });

  it("policy A holds through the brand: a newer version morphs the range in place", () => {
    const host = createFrameHost();
    const value = createFrameInsertable({ host, id: "nav" });
    createRoot(() => {
      r.insert(container, value);
    });
    host.apply({ type: "html", id: "nav", version: 1, html: "<h1>One</h1>" });
    const h1 = container.querySelector("h1");
    host.apply({ type: "html", id: "nav", version: 2, html: "<h1>Two</h1>" });
    expect(container.querySelector("h1")).toBe(h1);
    expect(h1.textContent).toBe("Two");
    value.dispose();
  });
});
