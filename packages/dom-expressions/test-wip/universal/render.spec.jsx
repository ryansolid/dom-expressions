/**
 * @jest-environment jsdom
 */
import * as r from "./custom";
import * as S from "s-js";

describe("render", () => {
  it("should render JSX", () => {
    let span;
    const favoriteCar = S.data("Porsche 911 Turbo");

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
