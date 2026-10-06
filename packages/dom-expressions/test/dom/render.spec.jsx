/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import * as S from "s-js";

describe("render", () => {
  it("preserves existing siblings when updating an appended root", () => {
    const div = document.createElement("div");
    div.innerHTML = "<p>Existing content</p>";
    const content = S.data("First page");
    const dispose = r.render(() => content, div);

    expect(div.innerHTML).toBe("<p>Existing content</p>First page");
    content("Next page");
    expect(div.innerHTML).toBe("<p>Existing content</p>Next page");
    dispose();
  });

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
