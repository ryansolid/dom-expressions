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
      `<rect x="0" y="0" width="150" height="150" style="fill: red; stroke: black; stroke-width: 5; opacity: 0.5;" class="classy" title="hello"></rect>`
    );
    setX(10);
    setY(50);
    flush();
    expect(rect.outerHTML).toBe(
      `<rect x="10" y="50" width="150" height="150" style="fill: red; stroke: black; stroke-width: 5; opacity: 0.5;" class="classy" title="hello"></rect>`
    );
  });

  it("Children of a component rendered inside <svg> receive the SVG namespace", () => {
    let g, circle;
    function Dot(props) {
      return (
        <g ref={g}>
          <circle ref={circle} cx={props.cx} cy={props.cy} r={5} fill="red" />
        </g>
      );
    }
    function App() {
      return (
        <svg width={200} height={200}>
          <Dot cx={100} cy={100} />
        </svg>
      );
    }

    createRoot(() => <App />);
    expect(g.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(circle.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });
});
