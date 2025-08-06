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


// avoid double escaping - https://github.com/ryansolid/dom-expressions/issues/393
{
  const a = ["<"];
  const div = <div>{[a, a]}</div>;

  it("avoids double escape 1", async () => {
    expect(r.renderToString(() => div)).toBe("<div>&lt;&lt;</div>");
  });
}

{
  let x = "<";
  let a = (
    <>
      {x}
      {x}
    </>
  );
  let v = (
    <>
      {a}
      {a}
    </>
  );
  it("avoids double escape 2", async () => {
    const stringified = '[["<","<"],["<","<"]]';

    expect(JSON.stringify(v)).toBe(stringified);
    expect(r.renderToString(() => <>{v}</>)).toBe("&lt;<!--!$-->&lt;&lt;<!--!$-->&lt;");
    expect(JSON.stringify(v)).toBe(stringified);
  });
}
