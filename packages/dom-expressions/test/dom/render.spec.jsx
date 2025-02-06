/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import { createSignal } from "@solidjs/signals";

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
