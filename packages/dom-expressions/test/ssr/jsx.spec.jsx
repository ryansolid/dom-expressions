/**
 * @jest-environment jsdom
 */
import * as r from "../../src/server";

const fixture1 = '<div style="--color:red"></div>';
const fixture2 = '<div style=""></div>';

const Comp1 = props => {
  return (
    <div
      style={{
        "--color": props.color
      }}
    />
  );
};

describe("renderToString", () => {
  it("keeps styles with values", async () => {
    let res = r.renderToString(() => <Comp1 color="red" />);
    expect(res).toBe(fixture1);
  });

  it("skips undefined styles", async () => {
    let res = r.renderToString(() => <Comp1 />);
    expect(res).toBe(fixture2);
  });
});
