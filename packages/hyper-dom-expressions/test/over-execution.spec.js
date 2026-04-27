/**
 * Pins upper bounds on how often component bodies, user accessors, and
 * row render functions run. A previous lazy implementation of
 * `hyper-dom-expressions` landed on `main` that fixed ownership but
 * regressed on over-execution (nested thunks re-running on every
 * parent change). These counter-based tests make that class of
 * regression loud.
 */

import { createRoot, createSignal, mapArray, onCleanup, flush } from "@solidjs/signals";
import { createHyperScript } from "../dist/hyper-dom-expressions";
import * as r from "dom-expressions/src/client";

const h = createHyperScript(r);

function For(props) {
  return mapArray(() => props.each, props.children);
}

describe("hyperscript over-execution guards", () => {
  test("component body runs exactly once across unrelated signal updates", () => {
    const [a, setA] = createSignal("a");
    const [b, setB] = createSignal("b");

    let bodyRuns = 0;
    const Comp = () => {
      bodyRuns++;
      return h(
        "div",
        () => a(),
        " ",
        () => b()
      );
    };

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h(Comp)();
    });

    expect(host.textContent).toBe("a b");
    expect(bodyRuns).toBe(1);

    setA("A");
    flush();
    expect(host.textContent).toBe("A b");
    expect(bodyRuns).toBe(1);

    setB("B");
    flush();
    expect(host.textContent).toBe("A B");
    expect(bodyRuns).toBe(1);

    dispose[0]();
  });

  test("a user accessor child re-runs only when its own signal changes", () => {
    const [a, setA] = createSignal(1);
    const [b, setB] = createSignal(10);

    let aReads = 0;
    let bReads = 0;
    const aAccess = () => {
      aReads++;
      return a();
    };
    const bAccess = () => {
      bReads++;
      return b();
    };

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h("div", aAccess, " ", bAccess)();
    });

    expect(host.textContent).toBe("1 10");
    expect(aReads).toBe(1);
    expect(bReads).toBe(1);

    setA(2);
    flush();
    expect(host.textContent).toBe("2 10");
    expect(aReads).toBe(2);
    expect(bReads).toBe(1);

    setB(20);
    flush();
    expect(host.textContent).toBe("2 20");
    expect(aReads).toBe(2);
    expect(bReads).toBe(2);

    dispose[0]();
  });

  test("For row render fn runs once per row, not per list mutation", () => {
    const mk = v => {
      const [g, s] = createSignal(v);
      return { v: g, setV: s };
    };

    let rowRuns = 0;
    const rows = [mk("a"), mk("b"), mk("c")];
    const [list, setList] = createSignal(rows);

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h(
        "ul",
        h(For, { each: list }, row => {
          rowRuns++;
          return h("li", () => row().v());
        })
      )();
    });

    expect(host.textContent).toBe("abc");
    expect(rowRuns).toBe(3);

    // append one — only the new row's render fn should run
    const extra = mk("d");
    setList([...rows, extra]);
    flush();
    expect(host.textContent).toBe("abcd");
    expect(rowRuns).toBe(4);

    // mutate an existing row's signal — no new row render fn invocations
    rows[0].setV("A");
    flush();
    expect(host.textContent).toBe("Abcd");
    expect(rowRuns).toBe(4);

    // drop an item from the middle — still no new row render fn invocations
    setList([rows[0], rows[2], extra]);
    flush();
    expect(host.textContent).toBe("Acd");
    expect(rowRuns).toBe(4);

    dispose[0]();
  });

  test("list mutation does not re-run sibling user accessors", () => {
    const [list, setList] = createSignal(["a", "b"]);
    const [side, setSide] = createSignal("S");

    let sideReads = 0;
    const sideAccess = () => {
      sideReads++;
      return side();
    };

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h(
        "div",
        h(For, { each: list }, v => h("span", v)),
        h("p", sideAccess)
      )();
    });

    expect(host.textContent).toBe("abS");
    expect(sideReads).toBe(1);

    setList(["a", "b", "c"]);
    flush();
    expect(host.textContent).toBe("abcS");
    expect(sideReads).toBe(1);

    setSide("T");
    flush();
    expect(host.textContent).toBe("abcT");
    expect(sideReads).toBe(2);

    dispose[0]();
  });

  test("component-children rows do not re-mount on list mutation", () => {
    // `mapArray` stores whatever its row callback returns. If that's a
    // raw hyperscript thunk, `r.insert.flatten` re-invokes it on every
    // list change, re-running the row component, re-creating its DOM,
    // and firing its `onCleanup` even for rows the diff would have
    // kept. `h(...)` materializes thunks at the callback-prop boundary
    // so what the consumer stores is already the rendered tree —
    // matching what JSX-compiled `<For>` produces.
    const rowExecs = new Map();
    const rowCleanups = new Map();

    function Row(props) {
      const id = props.item.id;
      rowExecs.set(id, (rowExecs.get(id) || 0) + 1);
      onCleanup(() => rowCleanups.set(id, (rowCleanups.get(id) || 0) + 1));
      return h("li", () => props.item.label);
    }

    const a = { id: "a", label: "A" };
    const b = { id: "b", label: "B" };
    const c = { id: "c", label: "C" };
    const [list, setList] = createSignal([a, b]);

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h("ul", h(For, { each: list, children: item => h(Row, { item }) }))();
    });

    expect(host.textContent).toBe("AB");
    expect(rowExecs.get("a")).toBe(1);
    expect(rowExecs.get("b")).toBe(1);
    expect(rowCleanups.size).toBe(0);

    setList([a, b, c]);
    flush();

    expect(host.textContent).toBe("ABC");
    expect(rowExecs.get("c")).toBe(1);
    expect(rowExecs.get("a")).toBe(1);
    expect(rowExecs.get("b")).toBe(1);
    expect(rowCleanups.get("a")).toBeUndefined();
    expect(rowCleanups.get("b")).toBeUndefined();

    setList([a, c]);
    flush();

    expect(host.textContent).toBe("AC");
    expect(rowExecs.get("a")).toBe(1);
    expect(rowExecs.get("c")).toBe(1);
    expect(rowCleanups.get("b")).toBe(1);

    dispose[0]();
    expect(rowCleanups.get("a")).toBe(1);
    expect(rowCleanups.get("c")).toBe(1);
  });

  test("component-children rows with an index argument also don't re-mount", () => {
    // Same shape as above but the row callback is 2-arity — covers
    // `mapArray((item, index) => ...)` style callers and any other
    // render-prop consumer that passes a positional index. The wrap
    // has to forward both arguments and still resolve the returned
    // tagged thunk so the diff doesn't re-build stable rows.
    const rowExecs = new Map();

    function Row(props) {
      const id = props.item.id;
      rowExecs.set(id, (rowExecs.get(id) || 0) + 1);
      return h("li", () => `${props.index}:${props.item.label}`);
    }

    const a = { id: "a", label: "A" };
    const b = { id: "b", label: "B" };
    const c = { id: "c", label: "C" };
    const [list, setList] = createSignal([a, b]);

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h("ul", h(For, { each: list, children: (item, i) => h(Row, { item, index: i }) }))();
    });

    expect(host.textContent).toBe("0:A1:B");
    expect(rowExecs.get("a")).toBe(1);
    expect(rowExecs.get("b")).toBe(1);

    setList([a, b, c]);
    flush();

    expect(host.textContent).toBe("0:A1:B2:C");
    expect(rowExecs.get("a")).toBe(1);
    expect(rowExecs.get("b")).toBe(1);
    expect(rowExecs.get("c")).toBe(1);

    dispose[0]();
  });

  test("component body does not re-run when unrelated sibling signal changes", () => {
    // Two sibling components under a common parent. Each has its own
    // signal. A change to one must not re-execute the other's body.
    const [a, setA] = createSignal("a");
    const [b] = createSignal("b");

    let aRuns = 0;
    let bRuns = 0;

    const A = () => {
      aRuns++;
      return h("span", () => a());
    };
    const B = () => {
      bRuns++;
      return h("span", () => b());
    };

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h("div", h(A), h(B))();
    });

    expect(host.textContent).toBe("ab");
    expect(aRuns).toBe(1);
    expect(bRuns).toBe(1);

    setA("A");
    flush();
    expect(host.textContent).toBe("Ab");
    expect(aRuns).toBe(1);
    expect(bRuns).toBe(1);

    dispose[0]();
  });
});
