/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import { createRoot, createSignal, flush } from "@solidjs/signals";
describe("Test style binding", () => {
  test("var from function", () => {
    createRoot(() => {
      {
        // defined
        const nope = () => "green";
        const div = (
          <div
            class="bg-(--bg)"
            style={{
              "--bg": nope()
            }}
          />
        );
        expect(div.style.cssText).toBe("--bg: green;");
      }

      {
        // undefined - https://github.com/ryansolid/dom-expressions/issues/429
        const nope = () => undefined;
        const div = (
          <div
            class="bg-(--bg)"
            style={{
              "--bg": nope()
            }}
          />
        );
        expect(div.style.cssText).toBe("");
      }
    });
  });

  // style() with a nullish value and a previous style object takes the
  // "clear everything" branch that routes through setAttribute(node, "style").
  test("clears inline style when value flips to null", () => {
    const [s, setS] = createSignal({ color: "red", "font-size": "12px" });
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = <div style={s()} />;
    });
    expect(div.style.color).toBe("red");
    expect(div.getAttribute("style")).not.toBeNull();

    setS(null);
    flush();
    expect(div.hasAttribute("style")).toBe(false);
    dispose();
  });

  test("removes dropped style properties on update", () => {
    const [s, setS] = createSignal({ color: "red", "font-size": "12px" });
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = <div style={s()} />;
    });
    expect(div.style.color).toBe("red");
    expect(div.style.fontSize).toBe("12px");

    setS({ color: "blue" });
    flush();
    expect(div.style.color).toBe("blue");
    expect(div.style.fontSize).toBe("");
    dispose();
  });

  test("removes a property set to explicit undefined", () => {
    const [on, setOn] = createSignal(true);
    const st = () => ({ color: on() ? "red" : undefined });
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = <div style={st()} />;
    });
    expect(div.style.color).toBe("red");

    setOn(false);
    flush();
    expect(div.style.color).toBe("");
    dispose();
  });

  test("does not mutate user style objects when toggling between constants", () => {
    const A = { color: "red", "background-color": "yellow" };
    const B = { color: "green" };
    const [flip, setFlip] = createSignal(false);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = <div style={flip() ? B : A} />;
    });
    expect(div.style.color).toBe("red");
    expect(div.style.backgroundColor).toBe("yellow");

    setFlip(true);
    flush();
    expect(div.style.color).toBe("green");
    expect(div.style.backgroundColor).toBe("");
    expect(A).toEqual({ color: "red", "background-color": "yellow" });

    setFlip(false);
    flush();
    expect(div.style.color).toBe("red");
    expect(div.style.backgroundColor).toBe("yellow");
    expect(B).toEqual({ color: "green" });
    dispose();
  });

  test("keeps a constant style object intact when a sibling binding updates", () => {
    const C = { color: "red", "background-color": "yellow" };
    const [n, setN] = createSignal(0);
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = <div title={`count ${n()}`} style={C} />;
    });
    expect(div.style.color).toBe("red");
    expect(div.style.backgroundColor).toBe("yellow");

    setN(1);
    flush();
    expect(div.getAttribute("title")).toBe("count 1");
    expect(C).toEqual({ color: "red", "background-color": "yellow" });
    expect(div.style.color).toBe("red");
    expect(div.style.backgroundColor).toBe("yellow");
    dispose();
  });

  // An initial string style should be replaced cleanly when the value
  // flips to an object — covers the `typeof prev === "string"` branch.
  test("replaces string style with object form", () => {
    const [s, setS] = createSignal("color: red");
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = <div style={s()} />;
    });
    expect(div.style.color).toBe("red");

    setS({ color: "green" });
    flush();
    expect(div.style.color).toBe("green");
    dispose();
  });
});

// r.style is a module-level helper. Calling it directly exercises branches
// that `<div style={...} />` can't reach (e.g. no prior value, default
// prev arg).
describe("r.style direct usage", () => {
  test("noops when both value and prev are falsy", () => {
    const node = document.createElement("div");
    // No prior style, clear with null → both early-return branches fire
    // without touching the node.
    r.style(node, null, undefined);
    expect(node.hasAttribute("style")).toBe(false);
  });

  test("applies default prev={} when omitted", () => {
    const node = document.createElement("div");
    // Only 2 args → prev defaults.
    r.style(node, { color: "red" });
    expect(node.style.color).toBe("red");
  });

  test("clears applied styles on nullish value without prev", () => {
    const node = document.createElement("div");
    r.style(node, { color: "red" });
    expect(node.style.color).toBe("red");

    r.style(node, null);
    expect(node.hasAttribute("style")).toBe(false);

    // and stays a no-op on nodes style() never touched
    const untouched = document.createElement("div");
    r.style(untouched, null);
    expect(untouched.hasAttribute("style")).toBe(false);
  });

  test("value === prev leaves the object and applied styles intact", () => {
    const node = document.createElement("div");
    const styles = { color: "red" };
    r.style(node, styles);
    expect(node.style.color).toBe("red");

    r.style(node, styles, styles);
    expect(styles).toEqual({ color: "red" });
    expect(node.style.color).toBe("red");
  });

  test("re-applies current values when the same object is mutated in place", () => {
    const node = document.createElement("div");
    const styles = { color: "red" };
    r.style(node, styles);
    expect(node.style.color).toBe("red");

    styles.color = "blue";
    r.style(node, styles, styles);
    expect(node.style.color).toBe("blue");
    expect(styles).toEqual({ color: "blue" });
  });

  test("removes a property deleted in place from the same object", () => {
    const node = document.createElement("div");
    // longhand: jsdom's removeProperty() cannot remove shorthands
    const styles = { color: "red", "background-color": "yellow" };
    r.style(node, styles);
    expect(node.style.color).toBe("red");
    expect(node.style.backgroundColor).toBe("yellow");

    delete styles["background-color"];
    r.style(node, styles, styles);
    expect(node.style.backgroundColor).toBe("");
    expect(node.style.color).toBe("red");

    styles.color = undefined;
    r.style(node, styles, styles);
    expect(node.style.color).toBe("");
  });

  test("does not clobber a manual style edit when the bound value is unchanged", () => {
    const node = document.createElement("div");
    const styles = { color: "red" };
    r.style(node, styles);
    expect(node.style.color).toBe("red");

    node.style.setProperty("color", "blue"); // manual edit, e.g. from a ref
    r.style(node, styles, styles); // sibling-triggered re-run, object unchanged
    expect(node.style.color).toBe("blue");

    styles.color = "green"; // ...but a real change still wins
    r.style(node, styles, styles);
    expect(node.style.color).toBe("green");
  });
});
