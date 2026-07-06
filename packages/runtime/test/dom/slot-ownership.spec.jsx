/**
 * @jest-environment jsdom
 */
// Slot-ownership probes for nodes that migrate between expression slots.
// Adjacent compiled slots can share a physical marker, so marker equality
// alone cannot identify which slot owns a node.
import { createRoot, createSignal, flush } from "@solidjs/signals";
import { insert } from "../../src/client";

describe("cross-slot node migration", () => {
  test("exchange between adjacent slots (tail position, null markers)", () => {
    const el1 = <span>1</span>;
    const el2 = <b>2</b>;
    const [swap, setSwap] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {swap() ? el2 : el1}
          {swap() ? el1 : el2}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("12");
    setSwap(true);
    flush();
    expect(div.textContent).toBe("21");
    setSwap(false);
    flush();
    expect(div.textContent).toBe("12");
    dispose();
  });

  test("exchange between adjacent slots (shared static-element marker)", () => {
    const el1 = <span>1</span>;
    const el2 = <b>2</b>;
    const [swap, setSwap] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {swap() ? el2 : el1}
          {swap() ? el1 : el2}
          <u>end</u>
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("12end");
    setSwap(true);
    flush();
    expect(div.textContent).toBe("21end");
    setSwap(false);
    flush();
    expect(div.textContent).toBe("12end");
    dispose();
  });

  test("single node migrating forward to the adjacent slot", () => {
    const el = <b>X</b>;
    const [right, setRight] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          <span>[</span>
          {right() ? null : el}
          {right() ? el : null}
          <span>]</span>
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("[X]");
    setRight(true);
    flush();
    expect(div.textContent).toBe("[X]");
    expect(div.contains(el)).toBe(true);
    setRight(false);
    flush();
    expect(div.textContent).toBe("[X]");
    expect(div.contains(el)).toBe(true);
    dispose();
  });

  test("arrays exchanging members across adjacent slots", () => {
    const el1 = <span>1</span>;
    const el2 = <span>2</span>;
    const el3 = <b>3</b>;
    const el4 = <b>4</b>;
    const [swap, setSwap] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {swap() ? [el3, el4] : [el1, el2]}
          {swap() ? [el1, el2] : [el3, el4]}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("1234");
    setSwap(true);
    flush();
    expect(div.textContent).toBe("3412");
    setSwap(false);
    flush();
    expect(div.textContent).toBe("1234");
    dispose();
  });

  test("rotation across three adjacent slots", () => {
    const els = [<span>a</span>, <span>b</span>, <span>c</span>];
    const [offset, setOffset] = createSignal(0);
    const at = i => els[(i + offset()) % 3];
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {at(0)}
          {at(1)}
          {at(2)}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("abc");
    setOffset(1);
    flush();
    expect(div.textContent).toBe("bca");
    setOffset(0);
    flush();
    expect(div.textContent).toBe("abc");
    dispose();
  });

  test("single node migrating backward to the preceding adjacent slot", () => {
    // Mirror the forward case: the receiving slot updates first.
    const el = <b>X</b>;
    const [left, setLeft] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          <span>[</span>
          {left() ? el : null}
          {left() ? null : el}
          <span>]</span>
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("[X]");
    setLeft(true);
    flush();
    expect(div.textContent).toBe("[X]");
    expect(div.contains(el)).toBe(true);
    dispose();
  });

  test("node handed to the next slot while its old slot becomes an array", () => {
    const el = <b>X</b>;
    const elA = <span>a</span>;
    const elB = <span>b</span>;
    const [swap, setSwap] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {swap() ? [elA, elB] : el}
          {swap() ? el : null}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("X");
    setSwap(true);
    flush();
    expect(div.textContent).toBe("abX");
    dispose();
  });

  test("exchange across an interleaved text expression slot", () => {
    // A text expression between two node slots still shares their marker.
    const el1 = <span>1</span>;
    const el2 = <b>2</b>;
    const [swap, setSwap] = createSignal(false);
    const [label, setLabel] = createSignal("-");
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {swap() ? el2 : el1}
          {label()}
          {swap() ? el1 : el2}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("1-2");
    setSwap(true);
    setLabel("+");
    flush();
    expect(div.textContent).toBe("2+1");
    dispose();
  });

  // If a slot loses every node while receiving fresh content, its position can
  // still be recovered from a later slot boundary.
  test("fresh content lands in position when the slot's old content migrates away", () => {
    const x = <span>x</span>;
    const y = <span>y</span>;
    const w = <b>w</b>;
    const z = <i>z</i>;
    const [steal, setSteal] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {steal() ? y : x}
          {steal() ? w : y}
          {z}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("xyz");
    setSteal(true);
    flush();
    expect(div.textContent).toBe("ywz");
    dispose();
  });

  // The first slot starts with marker ownership, then becomes token-owned
  // when a second slot registers on the same parent.
  test("exchange works when the second slot registers after the first updated", () => {
    const el1 = <span>1</span>;
    const el2 = <b>2</b>;
    const [a, setA] = createSignal([]);
    const [b, setB] = createSignal([el2]);
    const parent = document.createElement("div");
    let dispose;
    createRoot(d => {
      dispose = d;
      insert(parent, () => a(), null);
      flush();
      setA([el1]);
      flush();
      insert(parent, () => b(), null);
    });
    flush();
    expect(parent.textContent).toBe("12");

    setA([el2]);
    setB([el1]);
    flush();
    expect(parent.textContent).toBe("21");
    expect(parent.contains(el1)).toBe(true);
    expect(parent.contains(el2)).toBe(true);
    dispose();
  });

  // Function-valued children use the nested insert effect.
  test("exchange between adjacent slots holding function values", () => {
    const el1 = <span>1</span>;
    const el2 = <b>2</b>;
    const [swap, setSwap] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {() => (swap() ? el2 : el1)}
          {() => (swap() ? el1 : el2)}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("12");
    setSwap(true);
    flush();
    expect(div.textContent).toBe("21");
    setSwap(false);
    flush();
    expect(div.textContent).toBe("12");
    dispose();
  });

  test("node migrating through three parents in sequence", () => {
    const el = <b>X</b>;
    const [at, setAt] = createSignal(0);
    let p1, p2, p3, dispose;
    createRoot(d => {
      dispose = d;
      p1 = (
        <div>
          {at() === 1 ? [el] : []}
          {[]}
        </div>
      );
      p2 = (
        <div>
          {at() === 2 ? [el] : []}
          <u />
        </div>
      );
      p3 = (
        <div>
          {at() === 3 ? [el] : []}
          {[]}
        </div>
      );
    });
    flush();
    setAt(1);
    flush();
    expect(p1.contains(el)).toBe(true);
    setAt(2);
    flush();
    expect(p1.contains(el)).toBe(false);
    expect(p2.contains(el)).toBe(true);
    setAt(3);
    flush();
    expect(p2.contains(el)).toBe(false);
    expect(p3.contains(el)).toBe(true);
    setAt(0);
    flush();
    expect(p3.contains(el)).toBe(false);
    dispose();
  });

  // Move a middle array member while both arrays keep stable edges.
  test("middle array member migrating between adjacent slots", () => {
    const a1 = <span>a</span>;
    const m = <b>M</b>;
    const a2 = <span>b</span>;
    const b1 = <i>c</i>;
    const b2 = <i>d</i>;
    const [moved, setMoved] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {moved() ? [a1, a2] : [a1, m, a2]}
          {moved() ? [b1, m, b2] : [b1, b2]}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("aMbcd");
    setMoved(true);
    flush();
    expect(div.textContent).toBe("abcMd");
    setMoved(false);
    flush();
    expect(div.textContent).toBe("aMbcd");
    dispose();
  });

  // Same-node reuse is user error, but it should not crash or destroy the node.
  test("same node referenced by two slots at once: last insert wins, no crash", () => {
    const el = <b>X</b>;
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          <span>[</span>
          {[el]}
          {[el]}
          <span>]</span>
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("[X]");
    expect(div.contains(el)).toBe(true);
    dispose();
  });

  // Empty arrays remove the local anchor; refill should use slot order.
  test("slot emptied by [] regains its position when refilled", () => {
    const x1 = <span>x</span>;
    const x2 = <b>X</b>;
    const y = <i>y</i>;
    const [state, setState] = createSignal(0);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {state() === 0 ? [x1] : state() === 2 ? [x2] : []}
          {[y]}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("xy");
    setState(1);
    flush();
    expect(div.textContent).toBe("y");
    setState(2);
    flush();
    expect(div.textContent).toBe("Xy");
    dispose();
  });

  // One-shot slots keep stale `current`; boundary scans must ignore nodes
  // later adopted by another token-owned slot.
  test("positional recovery skips stale one-shot entries for stolen nodes", () => {
    const el = <b>X</b>;
    const y = <span>y</span>;
    const w = <span>w</span>;
    const c = <i>c</i>;
    const [state, setState] = createSignal(0);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {state() >= 2 ? [el, y] : state() >= 1 ? [el] : []}
          {state() >= 2 ? [w] : [y]}
          {[el]}
          {[c]}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("yXc");

    setState(1);
    flush();
    expect(div.textContent).toBe("Xyc");

    setState(2);
    flush();
    expect(div.textContent).toBe("Xywc");
    dispose();
  });

  // Normalize creates text nodes per slot; the element should survive a round
  // trip through a neighbor.
  test("slot cycling node -> text -> node while the neighbor borrows the node", () => {
    const el = <b>X</b>;
    const [state, setState] = createSignal(0);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {state() === 1 ? "hello" : el}
          {state() === 1 ? el : null}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("X");
    setState(1);
    flush();
    expect(div.textContent).toBe("helloX");
    expect(div.contains(el)).toBe(true);
    setState(0);
    flush();
    expect(div.textContent).toBe("X");
    expect(div.contains(el)).toBe(true);
    dispose();
  });

  // Manual multi-slot insert() calls against one surviving parent grow the
  // append-only registry. Correctness must survive stale entries.
  test("registry grows under repeated root creation on one parent, stays correct", () => {
    const parent = document.createElement("div");
    const CYCLES = 100;
    for (let i = 0; i < CYCLES; i++) {
      let dispose;
      const el = document.createElement("span");
      el.textContent = "r" + i;
      const [v, setV] = createSignal([el]);
      createRoot(d => {
        dispose = d;
        insert(parent, () => v(), null);
      });
      flush();
      setV([]);
      flush();
      dispose();
    }
    expect(parent._$slots.length).toBe(CYCLES);
    expect(parent.textContent).toBe("");

    const el1 = document.createElement("span");
    el1.textContent = "1";
    const el2 = document.createElement("b");
    el2.textContent = "2";
    const [a, setA] = createSignal([el1]);
    const [b, setB] = createSignal([el2]);
    let dispose;
    createRoot(d => {
      dispose = d;
      insert(parent, () => a(), null);
      insert(parent, () => b(), null);
    });
    flush();
    expect(parent.textContent).toBe("12");
    setA([el2]);
    setB([el1]);
    flush();
    expect(parent.textContent).toBe("21");
    dispose();
  });

  // Disposing one root does not remove manual insert() content; a live sibling
  // slot on the same parent must keep rendering and recovering boundaries.
  test("a live slot keeps working after a sibling root's slot is released", () => {
    const parent = document.createElement("div");
    const a1 = document.createElement("span");
    a1.textContent = "a";
    const b1 = document.createElement("b");
    b1.textContent = "b";
    const b2 = document.createElement("i");
    b2.textContent = "B";

    let disposeA;
    createRoot(d => {
      disposeA = d;
      const [va] = createSignal([a1]);
      insert(parent, () => va(), null);
    });
    let disposeB, setB;
    createRoot(d => {
      disposeB = d;
      const [vb, set] = createSignal([b1]);
      setB = set;
      insert(parent, () => vb(), null);
    });
    flush();
    expect(parent.textContent).toBe("ab");

    disposeA();
    // Disposal alone does not remove manual insert() content; here we only
    // care that B stays functional with an earlier stale registry entry.
    setB([b2]);
    flush();
    expect(parent.contains(b2)).toBe(true);
    expect(parent.contains(b1)).toBe(false);
    setB([]);
    flush();
    setB([b1]);
    flush();
    // Refill positioning still works with a stale entry in front of it.
    expect(parent.contains(b1)).toBe(true);
    disposeB();
  });

  // Mirror case: an EARLIER live slot must still anchor on a stale LATER slot
  // whose DOM remains in the parent.
  test("a live slot still anchors on a disposed-but-present later slot", () => {
    const parent = document.createElement("div");
    const a1 = document.createElement("span");
    a1.textContent = "a";
    const b1 = document.createElement("b");
    b1.textContent = "b";

    let disposeA, setA;
    createRoot(d => {
      disposeA = d;
      const [va, set] = createSignal([a1]);
      setA = set;
      insert(parent, () => va(), null);
    });
    let disposeB;
    createRoot(d => {
      disposeB = d;
      const [vb] = createSignal([b1]);
      insert(parent, () => vb(), null);
    });
    flush();
    expect(parent.textContent).toBe("ab");

    disposeB(); // b1 remains rendered under parent
    expect(parent.textContent).toBe("ab");

    setA([]);
    flush();
    expect(parent.textContent).toBe("b");
    setA([a1]);
    flush();
    // A refills BEFORE the disposed-but-present b1, not after it
    expect(parent.textContent).toBe("ab");
    disposeA();
  });

  test("control: exchange works when a static element separates the slots", () => {
    const el1 = <span>1</span>;
    const el2 = <b>2</b>;
    const [swap, setSwap] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          {swap() ? el2 : el1}
          <hr />
          {swap() ? el1 : el2}
        </div>
      );
    });
    flush();
    expect(div.textContent).toBe("12");
    setSwap(true);
    flush();
    expect(div.textContent).toBe("21");
    setSwap(false);
    flush();
    expect(div.textContent).toBe("12");
    dispose();
  });

  // Unshared parents retag adopted nodes with marker ownership.
  test("token-tagged node is owned by its new single-slot parent", () => {
    const el = <b>X</b>;
    const [state, setState] = createSignal(5);
    let src, dst, dispose;
    createRoot(d => {
      dispose = d;
      src = (
        <div>
          {state() === 0 ? [el] : []}
          {state() === 99 ? [el] : []}
        </div>
      );
      dst = (
        <div>
          {state() === 1 ? [el] : []}
          <u>end</u>
        </div>
      );
    });
    flush();
    setState(0);
    flush();
    expect(src.textContent).toBe("X");
    expect(dst.textContent).toBe("end");

    setState(1);
    flush();
    expect(dst.textContent).toBe("Xend");

    setState(2);
    flush();
    expect(dst.textContent).toBe("end");
    expect(dst.contains(el)).toBe(false);
    dispose();
  });

  test("control: single node migrating between slots in different parents", () => {
    const el = <b>X</b>;
    const [right, setRight] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = (
        <div>
          <div id="a">{right() ? null : el}</div>
          <div id="b">{right() ? el : null}</div>
        </div>
      );
    });
    flush();
    expect(div.querySelector("#a").textContent).toBe("X");
    setRight(true);
    flush();
    expect(div.querySelector("#b").textContent).toBe("X");
    expect(div.querySelector("#a").textContent).toBe("");
    setRight(false);
    flush();
    expect(div.querySelector("#a").textContent).toBe("X");
    dispose();
  });
});
