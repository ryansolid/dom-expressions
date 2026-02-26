/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import { createSignal, createRoot } from "@solidjs/signals";

describe("render", () => {
  it("should render JSX", () => {
    let span;
    const [favoriteCar] = createSignal("Porsche 911 Turbo");

    const DynamicChild = props => (
      <span ref={props.ref}>
        {props.name} loves {props.favoriteCar}
      </span>
    );

    const Component = () => <DynamicChild ref={span} name="John" favoriteCar={favoriteCar()} />;

    const div = document.createElement("div");
    r.render(Component, div);

    expect(div.innerHTML).toBe("<span>John loves Porsche 911 Turbo</span>");
  });
});

describe("applyRef", () => {
  it("should call a single function ref", () => {
    let received;
    const el = document.createElement("div");
    r.applyRef(el2 => (received = el2), el);
    expect(received).toBe(el);
  });

  it("should call each function in an array ref", () => {
    const calls = [];
    const el = document.createElement("div");
    r.applyRef([el2 => calls.push(["a", el2]), el2 => calls.push(["b", el2])], el);
    expect(calls).toEqual([
      ["a", el],
      ["b", el]
    ]);
  });

  it("should handle nested arrays via flat(Infinity)", () => {
    const calls = [];
    const el = document.createElement("div");
    r.applyRef(
      [el2 => calls.push("a"), [el2 => calls.push("b"), [el2 => calls.push("c")]]],
      el
    );
    expect(calls).toEqual(["a", "b", "c"]);
  });

  it("should skip falsy entries in arrays", () => {
    const calls = [];
    const el = document.createElement("div");
    r.applyRef([null, el2 => calls.push("a"), undefined, false, el2 => calls.push("b")], el);
    expect(calls).toEqual(["a", "b"]);
  });
});

describe("ref", () => {
  it("should resolve thunk and apply ref", () => {
    let received;
    const el = document.createElement("div");
    createRoot(() => {
      r.ref(() => el2 => (received = el2), el);
    });
    expect(received).toBe(el);
  });

  it("should handle array ref via thunk", () => {
    const calls = [];
    const el = document.createElement("div");
    createRoot(() => {
      r.ref(() => [el2 => calls.push("a"), el2 => calls.push("b")], el);
    });
    expect(calls).toEqual(["a", "b"]);
  });
});
