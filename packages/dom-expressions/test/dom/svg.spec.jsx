/**
 * @jest-environment jsdom
 */
import { createRoot, createSignal, flush } from "@solidjs/signals";

describe("create simple svg", () => {
  it("Ensure dynamic props are set as attributes", () => {
    let rect;
    const [x, setX] = createSignal(0),
      [y, setY] = createSignal(0),
      [style] = createSignal({
        fill: "red",
        stroke: "black",
        "stroke-width": 5,
        opacity: 0.5
      }),
      props = {
        class: "classy",
        title: "hello"
      };
    function Component() {
      return (
        <svg width="400" height="180">
          <rect x={x()} y={y()} ref={rect} width="150" height="150" style={style()} {...props} />
        </svg>
      );
    }

    createRoot(() => <Component />);
    expect(rect.outerHTML).toBe(
      `<rect width="150" height="150" x="0" y="0" style="fill: red; stroke: black; stroke-width: 5; opacity: 0.5;" class="classy" title="hello"></rect>`
    );
    setX(10);
    setY(50);
    flush();
    expect(rect.outerHTML).toBe(
      `<rect width="150" height="150" x="10" y="50" style="fill: red; stroke: black; stroke-width: 5; opacity: 0.5;" class="classy" title="hello"></rect>`
    );
  });
});
