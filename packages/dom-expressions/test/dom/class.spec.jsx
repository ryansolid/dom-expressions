/**
 * @jest-environment jsdom
 */
import { createRoot, createSignal, flush } from "@solidjs/signals";

describe("Test class binding", () => {
  test("Single binding", () => {
    const [color] = createSignal(true),
      [danger, setDanger] = createSignal(false),
      div = createRoot(() => <div class={{ color: color(), danger: danger() }} />);
    expect(div.className).toBe("color");

    setDanger(true);
    flush();
    expect(div.className).toBe("color danger");
  });

  test("Multi binding", () => {
    const [title] = createSignal("title"),
      [color] = createSignal(true),
      [danger, setDanger] = createSignal(false),
      div = createRoot(() => (
        <div title={title()} class={{ color: color(), danger: danger() }} />
      ));
    expect(div.className).toBe("color");

    setDanger(true);
    flush();
    expect(div.className).toBe("color danger");
  });

  test("Computed binding", () => {
    const [className, setClassName] = createSignal("active"),
      div = createRoot(() => <div class={{ [className()]: true }} />);
    expect(div.className).toBe("active");

    setClassName("danger");
    flush();
    expect(div.className).toBe("danger");

    setClassName(undefined);
    flush();
    expect(div.className).toBe("");
  });

  test("With leading/trailing spaces", () => {
    const [color] = createSignal(true),
      div = createRoot(() => <div class={{ " color ": color() }} />);
    expect(div.className).toBe("color");
  });

  test("Tailwind Style", () => {
    const div = createRoot(() => (
      <div
        class={{
          "px-2.5 py-1.5 text-xs": false,
          "px-3 py-2 text-sm": false,
          "px-4 py-2 text-sm": true,
          "px-4 py-2 text-base": false,
          "px-6 py-3 text-base": false
        }}
      />
    ));
    expect(div.className).toBe("px-4 py-2 text-sm");
  });

  test("With prop class and className", () => {
    const div = createRoot(() => (
      <div className="px-1" class={{ "text-sm": true, danger: false }} />
    ));
    expect(div.className).toBe("text-sm");
  });

  test("Array of strings", () => {
    let div;
    createRoot(() => {
      div = <div class={["one", "two", "three"]} />;
      expect(div.className).toBe("one two three");
    });
  });

  test("Array of strings and booleans", () => {
    let div;
    createRoot(() => {
      div = <div class={["one", false, "three"]} />;
      expect(div.className).toBe("one three");
    });
  });

  test("Array of Array of strings with trailing spaces", () => {
    let div;
    createRoot(() => {
      div = <div class={["  one  ", "two", "three"]} />;
      expect(div.className).toBe("one two three");
    });
  });

  test("Array with undefined", () => {
    let div;
    createRoot(() => {
      div = <div class={["one", undefined, "three"]} />;
      expect(div.className).toBe("one three");
    });
  });

  test("Array with null", () => {
    let div;
    createRoot(() => {
      div = <div class={["one", null, "three"]} />;
      expect(div.className).toBe("one three");
    });
  });

  test("Array with numbers", () => {
    let div;
    createRoot(() => {
      div = <div class={["one", 0, "three"]} />;
      expect(div.className).toBe("0 one three");
    });
  });

  test("Array with objects", () => {
    let div;
    createRoot(() => {
      div = <div class={["one", "two", "three", { two: false, four: true }]} />;
      expect(div.className).toBe("one three four");
    });
  });

  // Clearing a previously set string class (value === null / false) takes
  // the early-return branch in className() that removes the attribute.
  test("string class cleared to null removes attribute", () => {
    const [c, setC] = createSignal("hello");
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = <div class={c()} />;
    });
    expect(div.getAttribute("class")).toBe("hello");

    setC(null);
    flush();
    expect(div.hasAttribute("class")).toBe(false);
    dispose();
  });

  test("object class cleared to false removes attribute", () => {
    const [c, setC] = createSignal({ alpha: true, beta: true });
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = <div class={c()} />;
    });
    expect(div.className).toBe("alpha beta");

    setC(false);
    flush();
    expect(div.hasAttribute("class")).toBe(false);
    dispose();
  });

  // Switching prev from a raw string to an object value should reset
  // the prev-as-object bookkeeping and remove the old class attribute
  // before applying the new keys.
  test("string class switched to object swaps classes", () => {
    const [c, setC] = createSignal("old");
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = <div class={c()} />;
    });
    expect(div.className).toBe("old");

    setC({ fresh: true, bright: true });
    flush();
    expect(div.className).toBe("fresh bright");
    dispose();
  });

  test("string class switched to array swaps classes", () => {
    const [c, setC] = createSignal("legacy");
    let div, dispose;
    createRoot(d => {
      dispose = d;
      div = <div class={c()} />;
    });
    expect(div.className).toBe("legacy");

    setC(["next", "shiny"]);
    flush();
    expect(div.className).toBe("next shiny");
    dispose();
  });
});
