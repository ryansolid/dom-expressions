/**
 * @jest-environment jsdom
 */
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
