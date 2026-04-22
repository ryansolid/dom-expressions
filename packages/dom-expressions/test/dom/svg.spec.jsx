/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
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

  // xlink:href on <use> flows through assignProp → setAttributeNS.
  // A reactive signal value exercises both the set and the remove
  // branches (value === null removes via NS).
  it("sets and removes xlink:href via setAttributeNS", () => {
    let use, dispose;
    const [href, setHref] = createSignal("#icon-a");
    const xlinkNS = "http://www.w3.org/1999/xlink";

    createRoot(d => {
      dispose = d;
      <svg>
        <use ref={use} xlink:href={href()} />
      </svg>;
    });

    expect(use.getAttributeNS(xlinkNS, "href")).toBe("#icon-a");

    setHref(null);
    flush();
    expect(use.getAttributeNS(xlinkNS, "href")).toBe(null);
    dispose();
  });

  it("Children of a component rendered inside <math> receive the MathML namespace", () => {
    let row, identifier;
    function Term() {
      return (
        <mrow ref={row}>
          <mi ref={identifier}>x</mi>
        </mrow>
      );
    }
    function App() {
      return (
        <math display="block">
          <Term />
        </math>
      );
    }

    createRoot(() => <App />);
    expect(row.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
    expect(identifier.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
  });

  // Boolean `true` values are serialized as empty-string attributes.
  it("setAttribute with value=true serializes as empty-string attribute", () => {
    const node = document.createElement("div");
    r.setAttribute(node, "data-ready", true);
    expect(node.getAttribute("data-ready")).toBe("");
  });

  it("setAttributeNS with value=true serializes as empty-string attribute", () => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "use");
    const xlinkNS = "http://www.w3.org/1999/xlink";
    r.setAttributeNS(node, xlinkNS, "xlink:show", true);
    expect(node.getAttributeNS(xlinkNS, "show")).toBe("");
  });

  it("setAttributeNS removes attribute when name has no prefix", () => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "use");
    const xlinkNS = "http://www.w3.org/1999/xlink";
    node.setAttributeNS(xlinkNS, "href", "#icon");
    // Direct setAttributeNS with a local-only name hits the no-colon
    // branch of the removeAttributeNS helper.
    r.setAttributeNS(node, xlinkNS, "href", null);
    expect(node.getAttributeNS(xlinkNS, "href")).toBe(null);
  });
});
