/**
 * @jest-environment jsdom
 */
import * as r from "./custom";
import { createRenderer } from "../../src/universal";
import { createRoot, createSignal, flush, NotReadyError } from "@solidjs/signals";

describe("universal insert caching", () => {
  it("does not re-invoke accessor when inner memo updates", () => {
    let accessorCalls = 0;
    const [count, setCount] = createSignal(0);
    const parent = document.createElement("div");
    const staticNode = document.createElement("span");
    staticNode.textContent = "static";

    createRoot(() => {
      r.insert(parent, () => {
        accessorCalls++;
        return [r.memo(() => count()), staticNode];
      });
    });
    flush();

    expect(accessorCalls).toBe(1);
    expect(parent.innerHTML).toBe("0<span>static</span>");

    setCount(1);
    flush();

    expect(accessorCalls).toBe(1);
    expect(parent.innerHTML).toBe("1<span>static</span>");
  });

  it("still updates when accessor has direct reactive deps", () => {
    const [count, setCount] = createSignal(0);
    const parent = document.createElement("div");

    createRoot(() => {
      r.insert(parent, () => count());
    });
    flush();

    expect(parent.innerHTML).toBe("0");

    setCount(1);
    flush();

    expect(parent.innerHTML).toBe("1");
  });

  it("caches array with inline reactive functions", () => {
    let accessorCalls = 0;
    const [show, setShow] = createSignal(true);
    const parent = document.createElement("div");
    const staticNode = document.createElement("span");
    staticNode.textContent = "static";

    createRoot(() => {
      r.insert(parent, () => {
        accessorCalls++;
        return [() => (show() ? "yes" : "no"), staticNode];
      });
    });
    flush();

    expect(accessorCalls).toBe(1);
    expect(parent.innerHTML).toBe("yes<span>static</span>");

    setShow(false);
    flush();

    expect(accessorCalls).toBe(1);
    expect(parent.innerHTML).toBe("no<span>static</span>");
  });

  it("does not cache when accessor returns flat static content", () => {
    let accessorCalls = 0;
    const [count, setCount] = createSignal(0);
    const parent = document.createElement("div");

    createRoot(() => {
      r.insert(parent, () => {
        accessorCalls++;
        return [count(), "text"];
      });
    });
    flush();

    expect(accessorCalls).toBe(1);
    expect(parent.innerHTML).toBe("0text");

    setCount(1);
    flush();

    expect(accessorCalls).toBe(2);
    expect(parent.innerHTML).toBe("1text");
  });

  it("preserves declaration order for pending multi inserts that resolve later", () => {
    const parent = document.createElement("div");
    const marker = document.createTextNode("");
    const [firstReady, setFirstReady] = createSignal(false);
    const [secondReady, setSecondReady] = createSignal(false);
    parent.appendChild(marker);

    createRoot(() => {
      r.insert(
        parent,
        () => {
          if (!firstReady()) throw new NotReadyError(firstReady);
          return ["A"];
        },
        marker
      );
      r.insert(
        parent,
        () => {
          if (!secondReady()) throw new NotReadyError(secondReady);
          return ["B"];
        },
        marker
      );
    });
    flush();

    setSecondReady(true);
    flush();
    expect(parent.innerHTML).toBe("B");

    setFirstReady(true);
    flush();
    expect(parent.innerHTML).toBe("AB");
  });

  it("uses a host-provided sentinel factory for pending multi inserts", () => {
    const sentinels = [];
    const renderer = createRenderer({
      createElement(string) {
        return document.createElement(string);
      },
      createTextNode(value) {
        return document.createTextNode(value);
      },
      createSentinel() {
        const sentinel = document.createComment("sentinel");
        sentinels.push(sentinel);
        return sentinel;
      },
      replaceText(textNode, value) {
        textNode.data = value;
      },
      setProperty(node, name, value) {
        if (value == null) node.removeAttribute(name);
        else node.setAttribute(name, value);
      },
      insertNode(parent, node, anchor) {
        parent.insertBefore(node, anchor);
      },
      isTextNode(node) {
        return node.nodeType === 3;
      },
      removeNode(parent, node) {
        parent.removeChild(node);
      },
      getParentNode(node) {
        return node.parentNode;
      },
      getFirstChild(node) {
        return node.firstChild;
      },
      getNextSibling(node) {
        return node.nextSibling;
      }
    });
    const parent = document.createElement("div");
    const marker = document.createComment("marker");
    const [ready, setReady] = createSignal(false);
    parent.appendChild(marker);

    createRoot(() => {
      renderer.insert(
        parent,
        () => {
          if (!ready()) throw new NotReadyError(ready);
          return ["A"];
        },
        marker
      );
    });
    flush();

    expect(sentinels).toHaveLength(1);
    expect(parent.firstChild).toBe(sentinels[0]);
    expect(sentinels[0].nextSibling).toBe(marker);

    setReady(true);
    flush();

    expect(parent.innerHTML).toBe("A<!--marker-->");
  });
});
