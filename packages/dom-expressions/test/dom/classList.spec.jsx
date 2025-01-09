/**
 * @jest-environment jsdom
 */
import { createRoot, createSignal, flushSync } from "@solidjs/signals";

describe("Test classList binding", () => {
  test("Single binding", () => {
    const [color] = createSignal(true),
      [danger, setDanger] = createSignal(false),
      div = createRoot(() => <div classList={{ color: color(), danger: danger() }} />);
    expect(div.className).toBe("color");

    setDanger(true);
    flushSync();
    expect(div.className).toBe("color danger");
  });

  test("Multi binding", () => {
    const [title] = createSignal("title"),
      [color] = createSignal(true),
      [danger, setDanger] = createSignal(false),
      div = createRoot(() => (
        <div title={title()} classList={{ color: color(), danger: danger() }} />
      ));
    expect(div.className).toBe("color");

    setDanger(true);
    flushSync();
    expect(div.className).toBe("color danger");
  });

  test("Computed binding", () => {
    const [className, setClassName] = createSignal("active"),
      div = createRoot(() => <div classList={{ [className()]: true }} />);
    expect(div.className).toBe("active");

    setClassName("danger");
    flushSync();
    expect(div.className).toBe("danger");

    setClassName(undefined);
    flushSync();
    expect(div.className).toBe("");
  });

  test("With leading/trailing spaces", () => {
    const [color] = createSignal(true),
      div = createRoot(() => <div classList={{ " color ": color() }} />);
    expect(div.className).toBe("color");
  });

  test("Tailwind Style", () => {
    const div = createRoot(() => (
      <div
        classList={{
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
      <div className="px-1" class="py-2" classList={{ "text-sm": true, danger: false }} />
    ));
    expect(div.className).toBe("px-1 py-2 text-sm");
  });
});
