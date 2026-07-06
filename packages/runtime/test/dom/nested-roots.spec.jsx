/**
 * @jest-environment jsdom
 */
// Delegated events across nested render roots: a root rendered inside another
// root's DOM. The native event bubbles through the outer root's elements, so
// the outer root's delegated handlers must fire unless stopPropagation ran:
// each registered root walks its own segment of the propagation path.
import * as r from "../../src/client";
import { sharedConfig } from "../core";

function mount(el, code) {
  return r.render(code, el);
}

describe("delegated events across nested render roots", () => {
  const host = document.createElement("div");
  document.body.appendChild(host);

  afterEach(() => {
    host.innerHTML = "";
  });

  test("outer root's delegated handler fires for clicks inside a nested root", () => {
    let outer = 0;
    let native = 0;
    let inner = 0;
    let slot;
    const d1 = mount(host, () => (
      <div onClick={() => outer++} ref={el => el.addEventListener("click", () => native++)}>
        <div ref={el => (slot = el)} />
      </div>
    ));
    const d2 = mount(slot, () => <button onClick={() => inner++}>go</button>);

    slot.querySelector("button").click();
    expect(inner).toBe(1);
    expect(native).toBe(1);
    expect(outer).toBe(1);

    d2();
    d1();
  });

  test("three levels of nesting fire inner-to-outer, once each", () => {
    const order = [];
    let slot1, slot2;
    const d1 = mount(host, () => (
      <div onClick={() => order.push("outer")}>
        <div ref={el => (slot1 = el)} />
      </div>
    ));
    const d2 = mount(slot1, () => (
      <div onClick={() => order.push("middle")}>
        <div ref={el => (slot2 = el)} />
      </div>
    ));
    const d3 = mount(slot2, () => <button onClick={() => order.push("inner")}>go</button>);

    slot2.querySelector("button").click();
    expect(order).toEqual(["inner", "middle", "outer"]);

    d3();
    d2();
    d1();
  });

  test("two sibling nested roots stay isolated, outer fires for both", () => {
    let outer = 0;
    let innerA = 0;
    let innerB = 0;
    let slotA, slotB;
    const d1 = mount(host, () => (
      <div onClick={() => outer++}>
        <div ref={el => (slotA = el)} />
        <div ref={el => (slotB = el)} />
      </div>
    ));
    const d2 = mount(slotA, () => <button onClick={() => innerA++}>a</button>);
    const d3 = mount(slotB, () => <button onClick={() => innerB++}>b</button>);

    slotA.querySelector("button").click();
    expect([innerA, innerB, outer]).toEqual([1, 0, 1]);
    slotB.querySelector("button").click();
    expect([innerA, innerB, outer]).toEqual([1, 1, 2]);

    d3();
    d2();
    d1();
  });

  test("stopPropagation inside the nested root suppresses outer roots", () => {
    let outer = 0;
    let slot;
    const d1 = mount(host, () => (
      <div onClick={() => outer++}>
        <div ref={el => (slot = el)} />
      </div>
    ));
    const d2 = mount(slot, () => <button onClick={e => e.stopPropagation()}>go</button>);

    slot.querySelector("button").click();
    expect(outer).toBe(0);

    d2();
    d1();
  });

  test("handlers between the roots fire once, with correct currentTarget", () => {
    let slot;
    let wrapperFires = 0;
    let wrapperCurrentTargetOk = false;
    let wrapperEl;
    const d1 = mount(host, () => (
      <div>
        <section
          ref={el => (wrapperEl = el)}
          onClick={e => {
            wrapperFires++;
            wrapperCurrentTargetOk = e.currentTarget === wrapperEl;
          }}
        >
          <div ref={el => (slot = el)} />
        </section>
      </div>
    ));
    const d2 = mount(slot, () => <button onClick={() => {}}>go</button>);

    slot.querySelector("button").click();
    expect(wrapperFires).toBe(1);
    expect(wrapperCurrentTargetOk).toBe(true);

    d2();
    d1();
  });

  test("bound handler data is delivered on the resumed outer walk", () => {
    let received;
    let slot;
    const d1 = mount(host, () => (
      <div onClick={[d => (received = d), { menu: 42 }]}>
        <div ref={el => (slot = el)} />
      </div>
    ));
    const d2 = mount(slot, () => <button onClick={() => {}}>go</button>);

    slot.querySelector("button").click();
    expect(received).toEqual({ menu: 42 });

    d2();
    d1();
  });

  test("hydration replay handles all nested roots innermost-first", async () => {
    const order = [];
    let slot, btn;
    const d1 = mount(host, () => (
      <div onClick={() => order.push("outer")}>
        <div ref={el => (slot = el)} />
      </div>
    ));
    const d2 = mount(slot, () => (
      <button ref={el => (btn = el)} onClick={() => order.push("inner")}>
        go
      </button>
    ));

    const event = new MouseEvent("click", { bubbles: true });
    sharedConfig.registry = new Map();
    sharedConfig.events = [[btn, event]];
    sharedConfig.completed = new WeakSet([btn]);
    btn.dispatchEvent(event); // absorbed by the queued-event short-circuit
    expect(order).toEqual([]);

    sharedConfig.done = false;
    r.runHydrationEvents();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(order).toEqual(["inner", "outer"]);
    sharedConfig.registry = undefined;
    sharedConfig.events = undefined;
    sharedConfig.completed = undefined;
    d2();
    d1();
  });

  test("nested root inside an outer-owned external portal reaches outer handlers", () => {
    const calls = [];
    const portalMount = document.createElement("div");
    document.body.appendChild(portalMount);
    let logicalParent;
    const d1 = mount(host, () => (
      <section ref={el => (logicalParent = el)} onClick={() => calls.push("logical")} />
    ));

    const content = document.createElement("div");
    content.$$click = () => calls.push("content");
    portalMount.appendChild(content);
    content._$host = logicalParent;
    r.registerDelegatedContainer(portalMount, host);

    const slot = document.createElement("div");
    content.appendChild(slot);
    const d2 = mount(slot, () => <button onClick={() => calls.push("inner")}>go</button>);

    slot.querySelector("button").click();
    expect(calls).toEqual(["inner", "content", "logical"]);

    r.unregisterDelegatedContainer(portalMount, host);
    portalMount.remove();
    d2();
    d1();
  });

  test("clicking directly on the nested root's container fires its handler once", () => {
    let slotClicks = 0;
    let outerClicks = 0;
    let slot;
    const d1 = mount(host, () => (
      <div onClick={() => outerClicks++}>
        <section>
          <div onClick={() => slotClicks++} ref={el => (slot = el)} />
        </section>
      </div>
    ));
    const d2 = mount(slot, () => <button onClick={() => {}}>go</button>);

    slot.click();
    expect(slotClicks).toBe(1);
    expect(outerClicks).toBe(1);

    d2();
    d1();
  });

  test("clicking a nested-root container below an outer handler", () => {
    let slotClicks = 0;
    let rootClicks = 0;
    let slot;
    const d1 = mount(host, () => (
      <div onClick={() => rootClicks++}>
        <div onClick={() => slotClicks++} ref={el => (slot = el)} />
      </div>
    ));
    const d2 = mount(slot, () => <button onClick={() => {}}>go</button>);

    slot.click();
    expect(slotClicks).toBe(1);
    expect(rootClicks).toBe(1);

    d2();
    d1();
  });

  test("the nested root's container element handlers fire once", () => {
    // the slot element belongs to the outer root's JSX and may carry its own
    // delegated handler; the inner walk stops below its boundary, so the
    // outer walk must pick it up exactly once
    let slotClicks = 0;
    let slot;
    const d1 = mount(host, () => (
      <div>
        <div onClick={() => slotClicks++} ref={el => (slot = el)} />
      </div>
    ));
    const d2 = mount(slot, () => <button onClick={() => {}}>go</button>);

    slot.querySelector("button").click();
    expect(slotClicks).toBe(1);

    d2();
    d1();
  });
});
