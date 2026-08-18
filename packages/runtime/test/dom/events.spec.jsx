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
  r.registerDelegatedRoot(document.body);

  afterAll(() => {
    r.unregisterDelegatedRoot(document.body);
  });

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

  test("dispose clears root-owned events", () => {
    const root = document.createElement("div");
    let el, dispose;
    dispose = r.render(() => <button ref={el} onClick={() => count++} />, root);
    r.delegateEvents(["click"]);
    count = 0;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(count).toBe(1);
    dispose();
    eventTarget = Elements.el1;
    count = 0;
    stopPropagation = false;
    var event = new MouseEvent("click", { bubbles: true });
    el.dispatchEvent(event);
    expect(count).toBe(0);
  });
});

describe("native event listeners via ref callbacks", () => {
  const on = (type, handler, options) => el => el.addEventListener(type, handler, options);

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("wires a plain function listener", () => {
    let el, dispose;
    let calls = 0;

    createRoot(d => {
      dispose = d;
      document.body.appendChild(<div ref={[node => (el = node), on("click", () => calls++)]} />);
    });

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(calls).toBe(1);
    dispose();
  });

  it("passes capture listeners through native event ordering", () => {
    let child, dispose;
    const order = [];

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <section ref={on("click", () => order.push("parent"), { capture: true })}>
          <button ref={[node => (child = node), on("click", () => order.push("child"))]} />
        </section>
      );
    });

    child.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(order).toEqual(["parent", "child"]);
    dispose();
  });

  it("forwards addEventListener options such as passive and once", () => {
    let el, dispose;
    const events = [];
    const original = HTMLDivElement.prototype.addEventListener;
    const recorded = [];
    HTMLDivElement.prototype.addEventListener = function (type, listener, options) {
      recorded.push({ type, options });
      return original.call(this, type, listener, options);
    };

    try {
      createRoot(d => {
        dispose = d;
        document.body.appendChild(
          <div
            ref={[
              node => (el = node),
              on("click", e => events.push(e.type), { passive: true, once: true })
            ]}
          />
        );
      });

      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(events).toEqual(["click"]);
      expect(recorded.find(r => r.type === "click").options).toMatchObject({
        passive: true,
        once: true
      });
    } finally {
      HTMLDivElement.prototype.addEventListener = original;
      dispose();
    }
  });

  it("composes multiple native listeners with array refs", () => {
    let el, dispose;
    const order = [];

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <button
          ref={[
            node => (el = node),
            on("click", () => order.push("capture"), { capture: true }),
            on("click", () => order.push("bubble"))
          ]}
        />
      );
    });

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(order).toEqual(["capture", "bubble"]);
    dispose();
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
    r.registerDelegatedRoot(document.body);
    r.delegateEvents(["click"]);
    portalChild._$host = logicalParent;

    portalChild.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(calls).toEqual([
      ["portal", "BUTTON"],
      ["logical", "SECTION"]
    ]);

    dispose();
    r.unregisterDelegatedRoot(document.body);
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
    r.registerDelegatedRoot(document.body);
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
    r.unregisterDelegatedRoot(document.body);
  });
});

describe("root-owned event delegation", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("delegateEvents without a root does not install document listeners", () => {
    const button = document.createElement("button");
    const calls = [];
    button.$$click = () => calls.push("click");
    document.body.appendChild(button);

    r.delegateEvents(["click"]);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(calls).toEqual([]);
  });

  it("patches roots registered before delegateEvents", () => {
    const root = document.createElement("div");
    let button;
    let calls = 0;
    const dispose = r.render(() => <button ref={button} onClick={() => calls++} />, root);

    r.delegateEvents(["click"]);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(calls).toBe(1);
    dispose();
  });

  it("patches roots registered after delegateEvents", () => {
    const root = document.createElement("div");
    let button;
    let calls = 0;

    r.delegateEvents(["click"]);
    const dispose = r.render(() => <button ref={button} onClick={() => calls++} />, root);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(calls).toBe(1);
    dispose();
  });

  it("rendered ShadowRoot roots walk inside the shadow tree only", () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    let button;
    const calls = [];

    document.body.appendChild(host);
    host.$$click = () => calls.push("host");
    const dispose = r.render(
      () => (
        <section onClick={() => calls.push("section")}>
          <button ref={button} onClick={() => calls.push("button")} />
        </section>
      ),
      shadow
    );

    r.delegateEvents(["click"]);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(calls).toEqual(["button", "section"]);
    dispose();
  });

  it("keeps nested roots isolated for delegated handlers", () => {
    const outerRoot = document.createElement("div");
    const innerRoot = document.createElement("div");
    document.body.appendChild(outerRoot);
    outerRoot.appendChild(innerRoot);
    let innerButton;
    const calls = [];

    const disposeOuter = r.render(() => <section onClick={() => calls.push("outer")} />, outerRoot);
    const disposeInner = r.render(
      () => <button ref={innerButton} onClick={() => calls.push("inner")} />,
      innerRoot
    );

    innerButton.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(calls).toEqual(["inner"]);
    disposeInner();
    disposeOuter();
  });

  it("dispatches portal containers through their owner root without duplicate parent dispatch", () => {
    const root = document.createElement("div");
    const portalMount = document.createElement("div");
    let logicalParent, portalChild;
    const calls = [];

    document.body.appendChild(root);
    document.body.appendChild(portalMount);
    const dispose = r.render(
      () => <section ref={logicalParent} onClick={() => calls.push("logical")} />,
      root
    );
    portalMount.appendChild(<button ref={portalChild} onClick={() => calls.push("portal")} />);
    portalChild._$host = logicalParent;
    r.registerDelegatedContainer(portalMount, root);

    portalChild.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(calls).toEqual(["portal", "logical"]);
    r.unregisterDelegatedContainer(portalMount, root);
    dispose();
  });

  it("does not crash on events targeting the render root when a portal container is its ancestor (solidjs/solid#3008)", () => {
    const root = document.createElement("div");
    const calls = [];
    const errors = [];
    const onError = e => {
      errors.push(e.error);
      e.preventDefault();
    };

    document.body.appendChild(root);
    window.addEventListener("error", onError);
    const dispose = r.render(() => <section onClick={() => calls.push("logical")} />, root);
    // A Portal defaulting to document.body registers body as a delegated
    // container owned by the app root — an ancestor of the root, unlike the
    // sibling-mount cases above. body's handler then resumes from the root's
    // completed walk with a boundary (the root) below the resume point, and
    // used to climb past #document and throw.
    r.registerDelegatedContainer(document.body, root);

    try {
      root.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

      expect(errors).toEqual([]);
      expect(calls).toEqual([]);
    } finally {
      window.removeEventListener("error", onError);
      r.unregisterDelegatedContainer(document.body, root);
      dispose();
      document.body.removeChild(root);
    }
  });

  it("keeps container listeners until the final matching unregister", () => {
    const root = document.createElement("div");
    let button;
    let calls = 0;
    const dispose = r.render(() => <button ref={button} onClick={() => calls++} />, root);

    r.registerDelegatedRoot(root);
    r.delegateEvents(["click"]);
    r.unregisterDelegatedRoot(root);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(calls).toBe(1);

    r.unregisterDelegatedRoot(root);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(calls).toBe(1);
    dispose();
  });

  it("removes shared container listeners after the final owner unregisters", () => {
    const container = document.createElement("div");
    const ownerA = document.createElement("section");
    const ownerB = document.createElement("section");
    const remove = jest.spyOn(container, "removeEventListener");
    r.registerDelegatedContainer(container, ownerA);
    r.registerDelegatedContainer(container, ownerB);
    r.delegateEvents(["click"]);

    r.unregisterDelegatedContainer(container, ownerA);
    expect(remove).not.toHaveBeenCalledWith("click", expect.any(Function));

    r.unregisterDelegatedContainer(container, ownerB);
    expect(remove).toHaveBeenCalledWith("click", expect.any(Function));
    remove.mockRestore();
  });

  it("shared portal containers dispatch only to the owner found through _$host", () => {
    const portalMount = document.createElement("div");
    const ownerA = document.createElement("section");
    const ownerB = document.createElement("section");
    const logicalA = document.createElement("div");
    const logicalB = document.createElement("div");
    const buttonA = document.createElement("button");
    const buttonB = document.createElement("button");
    const calls = [];

    logicalA.$$click = () => calls.push("ownerA");
    logicalB.$$click = () => calls.push("ownerB");
    buttonA.$$click = () => calls.push("buttonA");
    buttonB.$$click = () => calls.push("buttonB");
    buttonA._$host = logicalA;
    buttonB._$host = logicalB;
    ownerA.appendChild(logicalA);
    ownerB.appendChild(logicalB);
    portalMount.append(buttonA, buttonB);

    r.registerDelegatedRoot(ownerA);
    r.registerDelegatedRoot(ownerB);
    r.registerDelegatedContainer(portalMount, ownerA);
    r.registerDelegatedContainer(portalMount, ownerB);
    r.delegateEvents(["click"]);

    buttonA.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    buttonB.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(calls).toEqual(["buttonA", "ownerA", "buttonB", "ownerB"]);

    r.unregisterDelegatedContainer(portalMount, ownerA);
    r.unregisterDelegatedContainer(portalMount, ownerB);
    r.unregisterDelegatedRoot(ownerA);
    r.unregisterDelegatedRoot(ownerB);
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

  it("treats null props as an empty object", () => {
    const node = document.createElement("div");
    // `props || (props = {})` must cope with explicit null.
    expect(() => r.assign(node, null, true, {})).not.toThrow();
  });

  it("defaults prevProps to {} when the 4th arg is omitted", () => {
    const node = document.createElement("div");
    // Only 3 args → prevProps default kicks in.
    expect(() => r.assign(node, { class: "alpha" }, true)).not.toThrow();
    expect(node.className).toBe("alpha");
  });

  it("skips the children key when clearing props between renders", () => {
    const node = document.createElement("div");
    const prevProps = {};
    const span = document.createElement("span");
    r.assign(node, { children: span, class: "one" }, false, prevProps);
    expect(node.firstChild).toBe(span);
    expect(node.className).toBe("one");

    // Second call omits class and children. The cleanup loop walks
    // prevProps and hits the `prop === "children"` continue branch.
    r.assign(node, {}, false, prevProps);
    expect(node.hasAttribute("class")).toBe(false);
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

// JSX onEvent compiles down to r.addEvent for the non-default
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

// Spread-driven non-delegated event paths only flow through assignProp when
// a spread changes across renders (direct JSX props short-circuit in the compiler).
describe("spread event handling", () => {
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
  // only the spread path routes through assignProp -> addEvent, which
  // is where the delegated + array branch of addEvent actually runs.
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

// `prop:name` in a spread strips the namespace and assigns the value to
// the corresponding DOM property (not an attribute).
describe("spread prop: namespace", () => {
  it("sets a DOM property via prop:name", () => {
    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div {...{ "prop:textContent": "hello" }} />;
    });
    expect(node.textContent).toBe("hello");
    // textContent is a property, not an attribute.
    expect(node.hasAttribute("textContent")).toBe(false);
    dispose();
  });

  it("updates a DOM property via prop:name across renders", () => {
    const [props, setProps] = createSignal({ "prop:title": "first" });
    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div {...props()} />;
    });
    expect(node.title).toBe("first");

    setProps({ "prop:title": "second" });
    flush();
    expect(node.title).toBe("second");
    dispose();
  });

  it("assigns arbitrary JS values via prop:name (not attribute-serialized)", () => {
    const payload = { answer: 42 };
    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div {...{ "prop:customData": payload }} />;
    });
    // Property carries the object reference directly.
    expect(node.customData).toBe(payload);
    expect(node.hasAttribute("customData")).toBe(false);
    dispose();
  });

  // Unknown namespaces in spread fall through to setAttribute (no NS
  // lookup), exercising the `hasNamespace && Namespaces[prefix]` false
  // branch in assignProp.
  it("unknown namespace prefix via spread falls through to setAttribute", () => {
    let node, dispose;
    createRoot(d => {
      dispose = d;
      node = <div {...{ "fake:attr": "v" }} />;
    });
    // setAttribute preserves the whole "fake:attr" name in attribute form.
    expect(node.getAttribute("fake:attr")).toBe("v");
    dispose();
  });
});
