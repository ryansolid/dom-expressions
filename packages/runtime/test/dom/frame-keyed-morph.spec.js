/**
 * @jest-environment jsdom
 */
// Keyed element matching in the morph — the element-level completion of
// identity-first (DR-5). Server markup can carry entity identity as a
// `_key` attribute; the child reconcile matches keyed elements by key
// (moving the existing node into position) instead of by position. Without
// it, live element state the morph deliberately preserves — value/checked
// (properties decoupled from attributes), `open` on <details>, focus —
// stays with the POSITION while the entity moves, silently reattributing
// user state on every reordering morph (the notes-sidebar "edited note
// jumps to top" shape).
import * as r from "../../src/client";
import { createRoot } from "@solidjs/signals";
import { createFrameElement, createFrameHost } from "../../src/frame-client";

function mount(id) {
  const host = createFrameHost();
  const { element, dispose } = createFrameElement({ host, id });
  let root;
  createRoot(d => {
    root = d;
    r.insert(document.body, () => element, null);
  });
  return {
    host,
    element,
    dispose() {
      dispose();
      root();
    }
  };
}

const li = (key, text) => `<li _key="${key}">${text}</li>`;

describe("keyed element matching (_key)", () => {
  afterEach(() => (document.body.textContent = ""));

  it("a reorder moves the keyed element instead of rewriting positions", () => {
    const { host, element, dispose } = mount("k1");
    host.apply({
      type: "html",
      id: "k1",
      version: 1,
      html: `<ul>${li("a", "Apple")}${li("b", "Banana")}${li("c", "Cherry")}</ul>`
    });
    const [a, b, c] = element.querySelectorAll("li");
    host.apply({
      type: "html",
      id: "k1",
      version: 2,
      html: `<ul>${li("c", "Cherry")}${li("a", "Apple")}${li("b", "Banana")}</ul>`
    });
    const after = [...element.querySelectorAll("li")];
    // Identity follows the key: same three nodes, new order.
    expect(after).toEqual([c, a, b]);
    expect(element.querySelector("ul").textContent).toBe("CherryAppleBanana");
    dispose();
  });

  it("live element state follows the entity across a reorder", () => {
    const { host, element, dispose } = mount("k2");
    host.apply({
      type: "html",
      id: "k2",
      version: 1,
      html:
        `<ul>` +
        `<li _key="1"><input value="" /></li>` +
        `<li _key="2"><details><summary>two</summary></details></li>` +
        `</ul>`
    });
    // User state the server can't know: typed input value (a property,
    // decoupled from the attribute) and an opened <details>.
    const input = element.querySelector("input");
    input.value = "draft text";
    const details = element.querySelector("details");
    details.open = true;
    // The edited entity jumps to the top (the notes-sidebar shape).
    host.apply({
      type: "html",
      id: "k2",
      version: 2,
      html:
        `<ul>` +
        `<li _key="2"><details><summary>two</summary></details></li>` +
        `<li _key="1"><input value="" /></li>` +
        `</ul>`
    });
    const rows = element.querySelectorAll("li");
    // State belongs to the entity, not the position.
    expect(rows[0].getAttribute("_key")).toBe("2");
    expect(rows[0].querySelector("details")).toBe(details);
    expect(details.open).toBe(true);
    expect(rows[1].getAttribute("_key")).toBe("1");
    expect(rows[1].querySelector("input")).toBe(input);
    expect(input.value).toBe("draft text");
    dispose();
  });

  it("a prepend keeps every existing keyed node", () => {
    const { host, element, dispose } = mount("k3");
    host.apply({
      type: "html",
      id: "k3",
      version: 1,
      html: `<ul>${li("a", "Apple")}${li("b", "Banana")}</ul>`
    });
    const [a, b] = element.querySelectorAll("li");
    host.apply({
      type: "html",
      id: "k3",
      version: 2,
      html: `<ul>${li("new", "Newest")}${li("a", "Apple")}${li("b", "Banana")}</ul>`
    });
    const after = [...element.querySelectorAll("li")];
    expect(after.length).toBe(3);
    expect(after[1]).toBe(a);
    expect(after[2]).toBe(b);
    dispose();
  });

  it("a removal does not shift a neighbor's node onto the removed key's position", () => {
    const { host, element, dispose } = mount("k4");
    host.apply({
      type: "html",
      id: "k4",
      version: 1,
      html: `<ul>${li("a", "Apple")}${li("b", "Banana")}${li("c", "Cherry")}</ul>`
    });
    const [, b, c] = element.querySelectorAll("li");
    host.apply({
      type: "html",
      id: "k4",
      version: 2,
      html: `<ul>${li("b", "Banana")}${li("c", "Cherry")}</ul>`
    });
    const after = [...element.querySelectorAll("li")];
    expect(after).toEqual([b, c]);
    dispose();
  });

  it("a keyed wrapper carries its slot range along when it moves", () => {
    const { host, element, dispose } = mount("k5");
    const row = (key, slot) =>
      `<li _key="${key}"><!--slot:${slot}:start--><!--slot:${slot}:end--></li>`;
    host.apply({
      type: "html",
      id: "k5",
      version: 1,
      html: `<ul>${row("a", "s1")}${row("b", "s2")}</ul>`
    });
    // Simulate a client fill: content the client owns, inside the range.
    const rows = element.querySelectorAll("li");
    const fill = document.createElement("span");
    fill.textContent = "client-owned";
    rows[0].insertBefore(fill, rows[0].lastChild);
    const rowA = rows[0];
    host.apply({
      type: "html",
      id: "k5",
      version: 2,
      html: `<ul>${row("b", "s2")}${row("a", "s1")}</ul>`
    });
    const after = [...element.querySelectorAll("li")];
    expect(after[1]).toBe(rowA);
    // The client-owned interior rode along with the wrapper.
    expect(after[1].querySelector("span")).toBe(fill);
    expect(fill.textContent).toBe("client-owned");
    dispose();
  });

  it("unkeyed siblings around keyed ones keep positional matching", () => {
    const { host, element, dispose } = mount("k6");
    host.apply({
      type: "html",
      id: "k6",
      version: 1,
      html: `<div><h1>Title</h1>${li("a", "Apple")}<p>footer</p></div>`
    });
    const h1 = element.querySelector("h1");
    const a = element.querySelector("li");
    const p = element.querySelector("p");
    host.apply({
      type: "html",
      id: "k6",
      version: 2,
      html: `<div><h1>New Title</h1>${li("a", "Apple")}<p>new footer</p></div>`
    });
    expect(element.querySelector("h1")).toBe(h1);
    expect(h1.textContent).toBe("New Title");
    expect(element.querySelector("li")).toBe(a);
    expect(element.querySelector("p")).toBe(p);
    expect(p.textContent).toBe("new footer");
    dispose();
  });
});
