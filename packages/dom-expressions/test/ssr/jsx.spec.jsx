/**
 * @jest-environment jsdom
 */
import * as r from "../../src/server";

// avoid double escaping - https://github.com/ryansolid/dom-expressions/issues/393

{
  const a = ["<"];
  const div = <div>{[a, a]}</div>;

  it("avoids double escape 1", async () => {
    expect(r.renderToString(() => div).replace(/<![^>]+>/g, "")).toBe("<div>&lt;&lt;</div>");
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
