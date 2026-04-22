import { createRoot, createSignal, flush } from "@solidjs/signals";
import { createHyperScript } from "../dist/hyper-dom-expressions";
import * as r from "dom-expressions/src/client";

const h = createHyperScript(r);

const FIXTURES = [
  '<div id="main"><h1>Welcome</h1><p>10Symbol($)</p><span style="color: rgb(85, 85, 85);">555</span><label for="entry" class="name">Edit:</label><input id="entry" type="text" readonly=""></div>',
  '<div id="main" refset="true" class="selected"><h1 title="hello" style="background-color: red;"><a href="/">Welcome</a></h1></div>',
  '<div id="main"><button>Click Bound</button><button>Click Delegated</button><button>Click Listener</button></div>',
  "<div>First</div>middle<div>Last</div>",
  '<div id="main"><div>John R.<span>Smith</span></div></div>',
  '<div id="main"><div name="John"><span>Smith</span></div></div>',
  '<div id="main"><div class="a b"></div></div>'
];

describe("Test HyperScript", () => {
  test("Simple Elements", () => {
    const dollar = Symbol("$");
    const template = h("#main", [
      h("h1", "Welcome"),
      h("p", 10n, dollar),
      h("span", { style: "color: #555" }, 555),
      h("label.name", { for: "entry" }, "Edit:"),
      h("input#entry", { type: "text", readonly: true })
    ]);
    expect(template.outerHTML).toBe(FIXTURES[0]);
  });

  test("Attribute Expressions", () => {
    const [selected] = createSignal(true),
      [welcoming] = createSignal("hello");
    let link;

    const template = createRoot(() =>
      h(
        "#main",
        {
          class: () => ({ selected: selected() }),
          ref: el => {
            el.setAttribute("refset", "true");
          }
        },
        h(
          "h1",
          {
            title: welcoming,
            style: () => ({ "background-color": "red" })
          },
          h("a", { href: "/", ref: r => (link = r) }, "Welcome")
        )
      )
    );
    expect(template.outerHTML).toBe(FIXTURES[1]);
  });

  test("Event Expressions", () => {
    const exec = {};

    const template = h("#main", [
      h("button", { onclick: () => (exec.bound = true) }, "Click Bound"),
      h("button", { onClick: () => (exec.delegated = true) }, "Click Delegated"),
      h("button", { "on:click": () => (exec.listener = true) }, "Click Listener")
    ]);
    expect(template.outerHTML).toBe(FIXTURES[2]);
    document.body.appendChild(template);
    var event = new MouseEvent("click", { bubbles: true });
    template.firstChild.dispatchEvent(event);
    event = new MouseEvent("click", { bubbles: true });
    template.firstChild.nextSibling.dispatchEvent(event);
    event = new MouseEvent("click", { bubbles: true });
    template.firstChild.nextSibling.nextSibling.dispatchEvent(event);

    expect(exec.bound).toBe(true);
    expect(exec.delegated).toBe(true);
    expect(exec.listener).toBe(true);
    document.body.textContent = "";
    r.clearDelegatedEvents();
  });

  test("Fragments", () => {
    const [inserted] = createSignal("middle");

    const div = createRoot(() => {
      const template = [h("div", "First"), inserted, h("div", "Last")];
      const div = document.createElement("div");
      r.insert(div, template);
      return div;
    });
    expect(div.innerHTML).toBe(FIXTURES[3]);
  });

  test("Components", () => {
    const Comp = props => h("div", () => props.name + " " + props.middle, props.children);
    const div = createRoot(() => {
      const template = h("#main", [
        h(Comp, { name: () => "John", middle: "R." }, () => h("span", "Smith"))
      ]);
      const div = document.createElement("div");
      div.appendChild(template);
      return div;
    });
    expect(div.innerHTML).toBe(FIXTURES[4]);
  });

  test("Component Spread", () => {
    const Comp = props => h("div", props);
    const div = createRoot(() => {
      const template = h("#main", [h(Comp, { name: () => "John" }, () => h("span", "Smith"))]);
      const div = document.createElement("div");
      div.appendChild(template);
      return div;
    });
    expect(div.innerHTML).toBe(FIXTURES[5]);
  });

  test("Class Spread", () => {
    const div = createRoot(() => {
      const template = h("#main", [h("div.a", { class: "b" })]);
      const div = document.createElement("div");
      div.appendChild(template);
      return div;
    });
    expect(div.innerHTML).toBe(FIXTURES[6]);
  });

  // --- Previously uncovered branches ---

  test("h() with a single array arg returns the array as-is", () => {
    const arr = [h("span", "a"), h("span", "b")];
    expect(h(arr)).toBe(arr);
  });

  test("h.Fragment returns its children through createComponent", () => {
    const first = h("span", "A");
    const second = h("span", "B");
    const result = h(h.Fragment, null, first, second);
    // Fragment is a component that returns props.children — because we
    // passed two extra args, children is the args array.
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([first, second]);
  });

  test("#id-only selector defaults to a div", () => {
    const el = h("#main");
    expect(el.tagName).toBe("DIV");
    expect(el.id).toBe("main");
  });

  test(".class-only selector defaults to a div", () => {
    const el = h(".a.b");
    expect(el.tagName).toBe("DIV");
    expect(el.className).toBe("a b");
  });

  test("SVG tag names go through the svg namespace", () => {
    const el = h("svg", h("circle"));
    expect(el.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(el.firstChild.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  test("MathML tag names go through the mathml namespace", () => {
    const el = h("mi", "x");
    expect(el.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
  });

  test("Date children render via toString", () => {
    const date = new Date(0);
    const el = h("p", date);
    expect(el.textContent).toBe(date.toString());
  });

  test("RegExp children render via toString", () => {
    const el = h("p", /foo/g);
    expect(el.textContent).toBe("/foo/g");
  });

  test("boolean children render via toString", () => {
    const el = h("p", true, " ", false);
    expect(el.textContent).toBe("true false");
  });

  test("null and undefined children are no-ops", () => {
    const el = h("div", null, undefined, "content");
    expect(el.textContent).toBe("content");
    expect(el.childNodes.length).toBe(1);
  });

  test("an existing Element passed as a child is inserted", () => {
    const existing = document.createElement("b");
    existing.textContent = "hi";
    const el = h("div", existing);
    expect(el.firstChild).toBe(existing);
  });

  test("function child other than the first position inserts dynamically", () => {
    const [text, setText] = createSignal("hello");
    const el = createRoot(() => h("div", "prefix:", () => text()));
    expect(el.textContent).toBe("prefix:hello");
    setText("world");
    flush();
    expect(el.textContent).toBe("prefix:world");
  });

  test("nested-array children with functions are detected as multiExpression", () => {
    const [val, setVal] = createSignal("a");
    const el = createRoot(() => h("div", "x", ["y", () => val()]));
    expect(el.textContent).toBe("xya");
    setVal("z");
    flush();
    expect(el.textContent).toBe("xyz");
  });

  test("component invoked with only children arg (no props) wraps args as props.children", () => {
    const Comp = props => h("p", props.children);
    const el = h(Comp, "just-text");
    expect(el.outerHTML).toBe("<p>just-text</p>");
  });

  test("component invoked with an Element as the second arg skips the props step", () => {
    // Element instance is neither null nor plain object → props stays
    // undefined and that Element becomes props.children.
    const Comp = props => h("section", props.children);
    const child = h("span", "inner");
    const el = h(Comp, child);
    expect(el.firstChild).toBe(child);
  });

  test("component with multiple extra args bundles them into props.children array", () => {
    const Comp = props => h("ul", props.children);
    const a = h("li", "a");
    const b = h("li", "b");
    const c = h("li", "c");
    const el = h(Comp, null, a, b, c);
    expect(el.children.length).toBe(3);
    expect(el.children[0]).toBe(a);
    expect(el.children[2]).toBe(c);
  });

  test("props with a getter route through r.spread (reactive updates)", () => {
    const [value, setValue] = createSignal("first");
    const props = {};
    Object.defineProperty(props, "title", {
      get() {
        return value();
      },
      enumerable: true,
      configurable: true
    });

    const el = createRoot(() => h("span", props));
    expect(el.getAttribute("title")).toBe("first");

    setValue("second");
    flush();
    expect(el.getAttribute("title")).toBe("second");
  });

  test("class option is merged with selector classes when both are present", () => {
    // The selector `.sel` adds class "sel"; the object `class: "opt"`
    // should merge rather than overwrite. Exercises the `classes.length !== 0`
    // branch where the existing classes array is folded into the value.
    const el = h("div.sel", { class: "opt" });
    expect(el.classList.contains("sel")).toBe(true);
    expect(el.classList.contains("opt")).toBe(true);
  });
});
