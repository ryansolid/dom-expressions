/**
 * @jest-environment jsdom
 */
import { createRoot, createSignal, flushSync } from "@solidjs/signals";

describe("Test conditional operators", () => {
  test("ternary expression triggered", () => {
    const [s, setS] = createSignal(0),
      div = createRoot(() => <div>{s() > 5 ? "Large" : "Small"}</div>);
    expect(div.innerHTML).toBe("Small");

    setS(7);
    flushSync();
    expect(div.innerHTML).toBe("Large");
  });

  test("boolean expression triggered", () => {
    const [s, setS] = createSignal(0),
      div = createRoot(() => <div>{s() > 5 && "Large"}</div>);
    expect(div.innerHTML).toBe("");

    setS(7);
    flushSync();
    expect(div.innerHTML).toBe("Large");
  });

  test("ternary expression triggered once", () => {
    let div1, div2;
    const [s, setS] = createSignal(6);

    createRoot(() => <div>{s() > 5 ? (div1 = <div />) : "Small"}</div>);
    div2 = div1;

    setS(7);
    flushSync();
    expect(div1).toBe(div2);
  });

  test("boolean expression triggered once", () => {
    let div1, div2;
    const [s, setS] = createSignal(6);
    createRoot(() => <div>{s() > 5 && (div1 = <div />)}</div>);
    div2 = div1;

    setS(7);
    flushSync();
    expect(div1).toBe(div2);
  });

  test("ternary prop triggered", () => {
    let div;
    function Comp(props) {
      return <div ref={div}>{props.render}</div>;
    }

    const [s, setS] = createSignal(0);
    createRoot(() => <Comp render={s() > 5 ? "Large" : "Small"} />);
    expect(div.innerHTML).toBe("Small");

    setS(7);
    flushSync();
    expect(div.innerHTML).toBe("Large");
  });

  test("boolean prop triggered", () => {
    let div;
    function Comp(props) {
      return <div ref={div}>{props.render}</div>;
    }

    const [s, setS] = createSignal(0);
    createRoot(() => <Comp render={s() > 5 && "Large"} />);
    expect(div.innerHTML).toBe("");

    setS(7);
    flushSync();
    expect(div.innerHTML).toBe("Large");
  });
});
