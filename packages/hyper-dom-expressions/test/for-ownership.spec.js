/**
 * Regression tests for https://github.com/solidjs/solid/issues/2453
 *
 * Under the lazy / tagged-thunk design, `h(For, …)` and its parent
 * `h("div", …)` both return thunks whose bodies run under `untrack`.
 * That means the parent's `insert` effect never subscribes to signals
 * the `For` memo reads, so list mutations don't take the whole parent
 * effect down with them and per-row render effects stay alive.
 *
 * The suite covers three shapes a user can write:
 *   1. idiomatic: `h("div", h(For, …))` — no extra wrapping.
 *   2. nested under a component parent: `h(Outer, null, h(For, …))`.
 *   3. explicitly wrapped in a user thunk: `h("div", () => h(For, …))`
 *      — redundant under laziness but must still behave.
 */

import { createRoot, createSignal, mapArray, onCleanup, flush } from "@solidjs/signals";
import { createHyperScript } from "../dist/hyper-dom-expressions";
import * as r from "dom-expressions/src/client";

const h = createHyperScript(r);

function For(props) {
  return mapArray(() => props.each, props.children);
}

function makeRow(text) {
  const [t, setT] = createSignal(text);
  return { t, setT };
}

describe("For + hyperscript ownership (issue #2453)", () => {
  test("idiomatic: For passed directly as a child", () => {
    const rows = [makeRow("a"), makeRow("b"), makeRow("c")];
    const [list, setList] = createSignal(rows);

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h(
        "div",
        h(For, { each: list }, row => h("p", () => row().t()))
      )();
    });

    expect(host.textContent).toBe("abc");

    rows[1].setT("B");
    flush();
    expect(host.textContent).toBe("aBc");

    const extra = makeRow("d");
    setList([...rows, extra]);
    flush();
    expect(host.textContent).toBe("aBcd");

    rows[0].setT("A");
    flush();
    expect(host.textContent).toBe("ABcd");

    extra.setT("D");
    flush();
    expect(host.textContent).toBe("ABcD");

    dispose[0]();
  });

  test("For nested under an outer component", () => {
    const rows = [makeRow("a"), makeRow("b")];
    const [list, setList] = createSignal(rows);

    const Outer = props => h("section", props.children);

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h(
        Outer,
        null,
        h(For, { each: list }, row => h("p", () => row().t()))
      )();
    });

    expect(host.textContent).toBe("ab");

    setList([...rows, makeRow("c")]);
    flush();
    expect(host.textContent).toBe("abc");

    rows[0].setT("A");
    flush();
    expect(host.textContent).toBe("Abc");

    dispose[0]();
  });

  test("sibling bindings survive a list mutation in the same parent", () => {
    // The literal failure mode described on solidjs/solid#2453: when
    // `For` is a child of `h("div", …)` alongside another reactive
    // binding, a list change used to dispose the sibling's render
    // effect too. Mutating `sideSig` afterwards stopped updating the
    // DOM. This test asserts both survive.
    const rows = [makeRow("a"), makeRow("b")];
    const [list, setList] = createSignal(rows);
    const [side, setSide] = createSignal("S");

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h(
        "div",
        h(For, { each: list }, row => h("span", () => row().t())),
        h("p", () => side())
      )();
    });

    expect(host.textContent).toBe("abS");

    setList([...rows, makeRow("c")]);
    flush();
    expect(host.textContent).toBe("abcS");

    setSide("T");
    flush();
    expect(host.textContent).toBe("abcT");

    // and the row signals still update too
    rows[0].setT("A");
    flush();
    expect(host.textContent).toBe("AbcT");

    dispose[0]();
  });

  test("sibling bindings survive under a component parent too", () => {
    const Outer = props => h("section", props.children);
    const rows = [makeRow("a"), makeRow("b")];
    const [list, setList] = createSignal(rows);
    const [side, setSide] = createSignal("S");

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h(
        Outer,
        null,
        h(For, { each: list }, row => h("span", () => row().t())),
        h("p", () => side())
      )();
    });

    expect(host.textContent).toBe("abS");

    setList([...rows, makeRow("c")]);
    flush();
    expect(host.textContent).toBe("abcS");

    setSide("T");
    flush();
    expect(host.textContent).toBe("abcT");

    dispose[0]();
  });

  test("nested For composes without leaking ownership across levels", () => {
    // Each outer row carries its own `items` signal. Mutating either
    // an outer row's items or the outer list must keep every inner
    // row still reactive — that only holds if each inner `For` is
    // rooted under its own outer row, not under a shared ancestor.
    const makeGroup = (label, items) => {
      const [is, setIs] = createSignal(items);
      return { label, items: is, setItems: setIs };
    };

    const groups = [makeGroup("g1", ["a", "b"]), makeGroup("g2", ["x"])];
    const [list, setList] = createSignal(groups);

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h(
        "div",
        h(For, { each: list }, group =>
          h(
            "ul",
            h(For, { each: () => group().items() }, item => h("li", item))
          )
        )
      )();
    });

    expect(host.textContent).toBe("abx");

    // mutate inner list of an existing group
    groups[0].setItems(["a", "b", "c"]);
    flush();
    expect(host.textContent).toBe("abcx");

    // add a whole new group — prior inner lists still react
    const g3 = makeGroup("g3", ["y", "z"]);
    setList([...groups, g3]);
    flush();
    expect(host.textContent).toBe("abcxyz");

    groups[1].setItems(["x", "X"]);
    flush();
    expect(host.textContent).toBe("abcxXyz");

    g3.setItems(["y", "Z"]);
    flush();
    expect(host.textContent).toBe("abcxXyZ");

    dispose[0]();
  });

  test("removed rows dispose their scope; survivors keep reacting", () => {
    // `onCleanup` fires when a row's owner disposes. Shrinking the
    // list should fire cleanup for exactly the rows that left, and
    // no others.
    const makeRow = text => {
      const [t, setT] = createSignal(text);
      return { t, setT, id: text };
    };

    const cleanups = [];
    const rows = [makeRow("a"), makeRow("b"), makeRow("c")];
    const [list, setList] = createSignal(rows);

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h(
        "ul",
        h(For, { each: list }, row => {
          onCleanup(() => cleanups.push(row().id));
          return h("li", () => row().t());
        })
      )();
    });

    expect(host.textContent).toBe("abc");
    expect(cleanups).toEqual([]);

    // drop the middle row
    setList([rows[0], rows[2]]);
    flush();
    expect(host.textContent).toBe("ac");
    expect(cleanups).toEqual(["b"]);

    // surviving rows must still react
    rows[0].setT("A");
    rows[2].setT("C");
    flush();
    expect(host.textContent).toBe("AC");

    // dispose the whole root — remaining rows clean up in some order
    dispose[0]();
    expect(cleanups.slice().sort()).toEqual(["a", "b", "c"]);
  });

  test("h.Fragment around a For preserves ownership", () => {
    const makeRow = text => {
      const [t, setT] = createSignal(text);
      return { t, setT };
    };

    const rows = [makeRow("a"), makeRow("b")];
    const [list, setList] = createSignal(rows);

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h(
        "div",
        h(
          h.Fragment,
          null,
          h(For, { each: list }, row => h("span", () => row().t()))
        )
      )();
    });

    expect(host.textContent).toBe("ab");

    setList([...rows, makeRow("c")]);
    flush();
    expect(host.textContent).toBe("abc");

    rows[0].setT("A");
    flush();
    expect(host.textContent).toBe("Abc");

    dispose[0]();
  });

  test("For wrapped in a redundant user thunk still works", () => {
    const rows = [makeRow("a"), makeRow("b"), makeRow("c")];
    const [list, setList] = createSignal(rows);

    const dispose = [];
    const host = createRoot(d => {
      dispose.push(d);
      return h("div", () => h(For, { each: list }, row => h("p", () => row().t())))();
    });

    expect(host.textContent).toBe("abc");

    rows[1].setT("B");
    flush();
    expect(host.textContent).toBe("aBc");

    setList([...rows, makeRow("d")]);
    flush();
    expect(host.textContent).toBe("aBcd");

    rows[0].setT("A");
    flush();
    expect(host.textContent).toBe("ABcd");

    dispose[0]();
  });
});
