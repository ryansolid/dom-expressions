/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import { createRoot, createSignal, flush } from "@solidjs/signals";

describe("Test Synthetic event bubbling", () => {
  const Elements = {
    el1: null,
    el2: null,
    el3: null
  };
  let eventTarget = null,
    count = 0,
    stopPropagation = false;
  function handleClick(data, e) {
    expect(e.currentTarget).toBe(Elements[`el${data}`]);
    expect(e.target).toBe(eventTarget);
    if (stopPropagation) e.stopPropagation();
    count++;
  }

  document.body.innerHTML = "";
  createRoot(() =>
    document.body.appendChild(
      <div ref={Elements.el1} onClick={[handleClick, 1]}>
        <div ref={Elements.el2} onClick={[handleClick, 2]}>
          <div ref={Elements.el3} onClick={[handleClick, 3]} />
        </div>
      </div>
    )
  );

  test("Fire top level event", () => {
    eventTarget = Elements.el1;
    count = 0;
    var event = new MouseEvent("click", { bubbles: true });
    eventTarget.dispatchEvent(event);
    expect(count).toBe(1);
  });

  test("Fire 2nd level event", () => {
    eventTarget = Elements.el2;
    count = 0;
    var event = new MouseEvent("click", { bubbles: true });
    eventTarget.dispatchEvent(event);
    expect(count).toBe(2);
  });

  test("Fire 3rd level event", () => {
    eventTarget = Elements.el3;
    count = 0;
    var event = new MouseEvent("click", { bubbles: true });
    eventTarget.dispatchEvent(event);
    expect(count).toBe(3);
  });

  test("Fire 3rd level event and stop propagation", () => {
    eventTarget = Elements.el3;
    count = 0;
    stopPropagation = true;
    var event = new MouseEvent("click", { bubbles: true });
    eventTarget.dispatchEvent(event);
    expect(count).toBe(1);
  });

  test("clear events", () => {
    r.clearDelegatedEvents();
    eventTarget = Elements.el1;
    count = 0;
    stopPropagation = false;
    var event = new MouseEvent("click", { bubbles: true });
    eventTarget.dispatchEvent(event);
    expect(count).toBe(0);
  })
});


// custom event
describe("Custom Events", () => {
  test("custom event with event listener options", () => {
    let elementRegular;
    let elementOnce;

    let count = 0;
    let eventTarget;

    function handleClick(e) {
      expect(e.currentTarget).toBe(eventTarget);
      expect(e.target).toBe(eventTarget);
      count++;
    }

    createRoot(() =>
      document.body.appendChild(
        <div>
          <div ref={elementRegular} on:click={{ handleEvent: handleClick }} />
          <div ref={elementOnce} on:click={{ handleEvent: handleClick, once: true }} />
        </div>
      )
    );

    const event = new MouseEvent("click", { bubbles: true });

    /** Dispatch a click twice to the regular element to check `count` is working a expected */

    eventTarget = elementRegular;

    count = 0;

    eventTarget.dispatchEvent(event);
    expect(count).toBe(1);

    eventTarget.dispatchEvent(event);
    expect(count).toBe(2);

    /** Dispatch a click twice to the `once` event handler */

    eventTarget = elementOnce;

    count = 0;

    eventTarget.dispatchEvent(event);
    expect(count).toBe(1);

    eventTarget.dispatchEvent(event);
    expect(count).toBe(1);
  });
});

// Exercises the branches of eventHandler that the core delegation tests
// don't reach:
//   - composedPath `_$host` portal re-target branch
//   - legacy fallback `walkUpTree()` when composedPath is absent
describe("eventHandler shadow/portal branches", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("portal-mounted child bubbles to its logical parent via _$host", () => {
    const calls = [];
    let logicalParent, portalChild, dispose;

    // Logical parent lives in a different part of the tree from the portal
    // child; _$host chains the two so eventHandler's composedPath scan
    // hands off to walkUpTree at the logical parent.
    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <section
          ref={logicalParent}
          onClick={e => calls.push(["logical", e.currentTarget.tagName])}
        />
      );
      document.body.appendChild(
        <aside>
          <button
            ref={portalChild}
            onClick={e => calls.push(["portal", e.currentTarget.tagName])}
          />
        </aside>
      );
    });
    // The JSX compiler's module-level delegateEvents(["click"]) may have
    // been cleared by earlier tests in this file.
    r.delegateEvents(["click"]);
    portalChild._$host = logicalParent;

    portalChild.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true })
    );

    expect(calls).toEqual([
      ["portal", "BUTTON"],
      ["logical", "SECTION"]
    ]);

    dispose();
  });

  it("walks up the tree when the event has no composedPath (legacy browser fallback)", () => {
    const calls = [];
    let outer, inner, dispose;

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <div ref={outer} onClick={e => calls.push(["outer", e.currentTarget.tagName])}>
          <div ref={inner} onClick={e => calls.push(["inner", e.currentTarget.tagName])} />
        </div>
      );
    });
    r.delegateEvents(["click"]);

    // Strip composedPath so eventHandler falls back to walkUpTree.
    const event = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(event, "composedPath", { value: undefined });
    inner.dispatchEvent(event);

    expect(calls).toEqual([
      ["inner", "DIV"],
      ["outer", "DIV"]
    ]);

    dispose();
  });
});

describe("r.assign direct usage", () => {
  // Exported assign() handles ref props itself when skipRef is false —
  // spread() skips them, so this branch is only reachable via direct calls.
  it("runs function refs when called with skipRef=false", () => {
    const node = document.createElement("div");
    const seen = [];
    let dispose;
    createRoot(d => {
      dispose = d;
      r.assign(node, { ref: el => seen.push(el) }, true, {}, false);
    });
    expect(seen).toEqual([node]);
    dispose();
  });

  it("passes children through to insertExpression when skipChildren=false", () => {
    const node = document.createElement("div");
    const span = document.createElement("span");
    span.textContent = "hi";
    r.assign(node, { children: span, class: "wrap" }, false, {});
    expect(node.className).toBe("wrap");
    expect(node.firstChild).toBe(span);
  });

  it("routes SELECT value through the DOMWithState property branch", () => {
    // Create a <select> with option children first so that the value
    // assignment can match one of the options.
    const select = document.createElement("select");
    ["alpha", "beta", "gamma"].forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });

    r.assign(select, { value: "beta" }, true, {});
    // SELECT value is set via a queueMicrotask, so wait a microtask.
    return Promise.resolve().then(() => {
      expect(select.value).toBe("beta");
    });
  });
});

// JSX onEvent compiles down to r.addEventListener for the non-default
// branches (delegated+array, delegated+plain, non-delegated array+data).
describe("JSX event wiring variants", () => {
  it("onClick={[handler, data]} stores $$click and $$clickData for delegation", () => {
    const handler = jest.fn();
    const data = { id: 42 };
    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div onClick={[handler, data]} />;
    });
    expect(node.$$click).toBe(handler);
    expect(node.$$clickData).toBe(data);
    dispose();
  });

  it("onClick={handler} stores $$click without data", () => {
    const handler = jest.fn();
    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div onClick={handler} />;
    });
    expect(node.$$click).toBe(handler);
    expect(node.$$clickData).toBeUndefined();
    dispose();
  });

  it("onMouseEnter={[handler, data]} forwards data via a native listener", () => {
    const received = [];
    const handler = (d, e) => received.push([d, e.type]);
    const data = "payload";
    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div onMouseEnter={[handler, data]} />;
    });
    node.dispatchEvent(new Event("mouseenter"));
    expect(received).toEqual([["payload", "mouseenter"]]);
    dispose();
  });
});

// Spread-driven event paths: `on:name` and plain `onName` non-delegated
// events only flow through assignProp when a spread changes across
// renders (direct JSX props short-circuit in the compiler).
describe("spread event handling", () => {
  it("on:foo from a reactive spread swaps listeners on update", () => {
    const firstCalls = [];
    const secondCalls = [];
    const h1 = e => firstCalls.push(e.type);
    const h2 = e => secondCalls.push(e.type);
    const [props, setProps] = createSignal({ "on:foo": h1 });

    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div {...props()} />;
    });

    node.dispatchEvent(new Event("foo"));
    expect(firstCalls).toHaveLength(1);

    setProps({ "on:foo": h2 });
    flush();
    node.dispatchEvent(new Event("foo"));
    expect(firstCalls).toHaveLength(1);
    expect(secondCalls).toHaveLength(1);
    dispose();
  });

  it("non-delegated onMouseEnter from a reactive spread swaps listeners on update", () => {
    const firstCalls = [];
    const secondCalls = [];
    const h1 = e => firstCalls.push(e.type);
    const h2 = e => secondCalls.push(e.type);
    const [props, setProps] = createSignal({ onMouseEnter: h1 });

    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div {...props()} />;
    });

    node.dispatchEvent(new Event("mouseenter"));
    expect(firstCalls).toHaveLength(1);

    setProps({ onMouseEnter: h2 });
    flush();
    node.dispatchEvent(new Event("mouseenter"));
    expect(firstCalls).toHaveLength(1);
    expect(secondCalls).toHaveLength(1);
    dispose();
  });

  it("non-delegated onMouseEnter swaps an array prev handler for a plain one", () => {
    const firstCalls = [];
    const secondCalls = [];
    const firstHandler = function (d, e) {
      firstCalls.push([d, e.type]);
    };
    const secondHandler = e => secondCalls.push(e.type);
    const [props, setProps] = createSignal({
      onMouseEnter: [firstHandler, "p1"]
    });

    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div {...props()} />;
    });

    node.dispatchEvent(new Event("mouseenter"));
    expect(firstCalls).toEqual([["p1", "mouseenter"]]);

    setProps({ onMouseEnter: secondHandler });
    flush();
    node.dispatchEvent(new Event("mouseenter"));
    expect(firstCalls).toHaveLength(1);
    expect(secondCalls).toEqual(["mouseenter"]);
    dispose();
  });

  // Direct JSX `onClick={[h, d]}` compiles to `$$click = h; $$clickData = d`;
  // only the spread path routes through assignProp → addEventListener, which
  // is where the delegated + array branch of addEventListener actually runs.
  it("onClick={[handler, data]} via spread sets $$click and $$clickData for delegation", () => {
    const handler = jest.fn();
    const data = { id: 7 };
    const [props, setProps] = createSignal({ onClick: [handler, data] });

    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div {...props()} />;
    });
    expect(node.$$click).toBe(handler);
    expect(node.$$clickData).toBe(data);

    // Update the data through the spread to prove the array branch runs
    // again, not just on first render.
    const newData = { id: 8 };
    setProps({ onClick: [handler, newData] });
    flush();
    expect(node.$$clickData).toBe(newData);
    dispose();
  });
});