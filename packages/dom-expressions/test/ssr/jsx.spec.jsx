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

describe("SSR attribute escaping (JSX)", () => {
  it("escapes quotes in template-literal quasis used as object style values", () => {
    const src = "onclick='alert(1);'";
    const res = r.renderToString(() => (
      <div
        style={{
          height: "100px",
          "background-image": `url("${src}")`
        }}
      />
    ));
    expect(res).toContain("background-image:url(&quot;");
    expect(res).not.toContain('"onclick=');
  });

  it("escapes quotes in template-literal quasis used as attribute values", () => {
    const src = "onclick='alert(1);'";
    const res = r.renderToString(() => <div title={`url("${src}")`} />);
    expect(res).toContain('title="url(&quot;');
    expect(res).not.toContain('"onclick=');
  });
});
