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
});
