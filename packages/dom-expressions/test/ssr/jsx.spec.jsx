/**
 * @jest-environment jsdom
 */
import * as r from "../../src/server";
import { omit } from "@solidjs/signals";

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

describe("dynamic attributes", () => {
  it("renders dynamic attribute on a standard element", () => {
    const state = { name: "hello" };
    const res = r.renderToString(() => <div name={state.name} />);
    expect(res).toBe('<div name="hello"></div>');
  });

  it("renders mixed static and dynamic attributes", () => {
    const state = { name: "hello" };
    const res = r.renderToString(() => <div id="fixed" name={state.name} class="box" />);
    expect(res).toBe('<div id="fixed" name="hello" class="box"></div>');
  });

  it("omits attribute when value is null or undefined", () => {
    const res1 = r.renderToString(() => <div title={null} />);
    expect(res1).toBe("<div></div>");
    const res2 = r.renderToString(() => <div title={undefined} />);
    expect(res2).toBe("<div></div>");
  });

  it("renders checked and value with other dynamic attributes", () => {
    const state = { name: "field1", on: true };
    const res = r.renderToString(() => (
      <input type="checkbox" name={state.name} checked={state.on} />
    ));
    expect(res).toBe('<input type="checkbox" name="field1" checked>');
  });
});

describe("text interpolation", () => {
  it("renders dynamic text child", () => {
    const state = { name: "world" };
    const res = r.renderToString(() => <div>Hello {state.name}</div>);
    expect(res).toBe("<div>Hello world</div>");
  });

  it("renders multiple dynamic text children", () => {
    const state = { first: "Jane", last: "Doe" };
    const res = r.renderToString(() => (
      <div>
        {state.first} {state.last}
      </div>
    ));
    expect(res).toBe("<div>Jane Doe</div>");
  });

  it("escapes dynamic text", () => {
    const state = { text: "<script>alert(1)</script>" };
    const res = r.renderToString(() => <div>{state.text}</div>);
    expect(res).toBe("<div>&lt;script>alert(1)&lt;/script></div>");
  });
});

describe("conditional rendering", () => {
  it("renders true branch of ternary", () => {
    const show = true;
    const res = r.renderToString(() => <div>{show ? <span>yes</span> : <span>no</span>}</div>);
    expect(res).toBe("<div><span>yes</span></div>");
  });

  it("renders false branch of ternary", () => {
    const show = false;
    const res = r.renderToString(() => <div>{show ? <span>yes</span> : <span>no</span>}</div>);
    expect(res).toBe("<div><span>no</span></div>");
  });

  it("renders with && operator", () => {
    const res1 = r.renderToString(() => <div>{true && <span>visible</span>}</div>);
    expect(res1).toBe("<div><span>visible</span></div>");
    const res2 = r.renderToString(() => <div>{false && <span>hidden</span>}</div>);
    expect(res2).toBe("<div></div>");
  });
});

describe("components", () => {
  it("renders component with props and children", () => {
    const Greeting = props => <span>Hello {props.name}</span>;
    const res = r.renderToString(() => <Greeting name="world" />);
    expect(res).toBe("<span>Hello world</span>");
  });

  it("renders nested components", () => {
    const Inner = props => <em>{props.text}</em>;
    const Outer = props => (
      <div>
        <Inner text={props.label} />
      </div>
    );
    const res = r.renderToString(() => <Outer label="nested" />);
    expect(res).toBe("<div><em>nested</em></div>");
  });
});

describe("class handling", () => {
  it("renders class from object", () => {
    const res = r.renderToString(() => (
      <div class={{ active: true, disabled: false, highlighted: true }} />
    ));
    expect(res).toBe('<div class="active  highlighted"></div>');
  });

  it("renders class from string", () => {
    const state = { cls: "my-class" };
    const res = r.renderToString(() => <div class={state.cls} />);
    expect(res).toBe('<div class="my-class"></div>');
  });
});

describe("spread attributes", () => {
  it("renders spread props on native element", () => {
    const props = { id: "test", class: "box" };
    const res = r.renderToString(() => <div {...props}>content</div>);
    expect(res).toBe('<div id="test" class="box">content</div>');
  });

  it("renders spread with overrides", () => {
    const props = { id: "base", class: "a" };
    const res = r.renderToString(() => <div {...props} class="b" />);
    expect(res).toBe('<div id="base" class="b"></div>');
  });
});

describe("fragments", () => {
  it("renders fragment with mixed elements and text", () => {
    const res = r.renderToString(() => (
      <div>
        <>
          <span>A</span> and <span>B</span>
        </>
      </div>
    ));
    expect(res).toBe("<div><span>A</span> and <span>B</span></div>");
  });

  it("renders fragment with adjacent text nodes using separators", () => {
    const a = "hello";
    const b = "world";
    const res = r.renderToString(() => (
      <div>
        <>
          {a}
          {b}
        </>
      </div>
    ));
    expect(res).toBe("<div>hello<!--!$-->world</div>");
  });
});

describe("video with static muted", () => {
  it("renders video with muted attribute and src", () => {
    const res = r.renderToString(() => <video src="test.mp4" muted />);
    expect(res).toContain("muted");
    expect(res).toContain('src="test.mp4"');
  });
});

describe("component with ref, omit, spread, and children", () => {
  it("renders component with spread props and children", () => {
    function MyComponent(props) {
      let el;
      const others = omit(props, "children");
      return (
        <div ref={el} {...others}>
          {props.children}
        </div>
      );
    }

    const res = r.renderToString(() => (
      <MyComponent class="test" data-id="123">
        <span>Hello</span>
      </MyComponent>
    ));
    expect(res).toContain('class="test"');
    expect(res).toContain('data-id="123"');
    expect(res).toContain("<span>Hello</span>");
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
