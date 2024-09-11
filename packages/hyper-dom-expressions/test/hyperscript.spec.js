import * as S from "s-js";
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
    const dollar = Symbol('$');
    const template = h("#main", [
      h("h1", "Welcome"),
      h('p', 10n, dollar),
      h("span", { style: "color: #555" }, 555),
      h("label.name", { htmlFor: "entry" }, "Edit:"),
      h("input#entry", { type: "text", readonly: true })
    ])();
    expect(template.outerHTML).toBe(FIXTURES[0]);
  });

  test("Attribute Expressions", () => {
    const selected = S.data(true),
      welcoming = S.data("hello");
    let link;

    S.root(() => {
      const template = h(
        "#main",
        {
          classList: () => ({ selected: selected() }),
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
      )();
      expect(template.outerHTML).toBe(FIXTURES[1]);
    });
  });

  test("Event Expressions", () => {
    const exec = {};

    const template = h("#main", [
      h("button", { onclick: () => (exec.bound = true) }, "Click Bound"),
      h("button", { onClick: () => (exec.delegated = true) }, "Click Delegated"),
      h("button", { "on:click": () => (exec.listener = true) }, "Click Listener")
    ])();
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
    const inserted = S.data("middle");

    S.root(() => {
      const template = h([h("div", "First"), inserted, h("div", "Last")]);
      const div = document.createElement("div");
      r.insert(div, template);
      expect(div.innerHTML).toBe(FIXTURES[3]);
    });
  });

  test("Components", () => {
    const Comp = props => h("div", () => props.name + " " + props.middle, props.children);
    S.root(() => {
      const template = h("#main", [
        h(Comp, { name: () => "John", middle: "R." }, () => h("span", "Smith"))
      ])();
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML).toBe(FIXTURES[4]);
    });
  });

  test("Component Spread", () => {
    const Comp = props => h("div", props);
    S.root(() => {
      const template = h("#main", [
        h(Comp, { name: () => "John" }, () => h("span", "Smith"))
      ])();
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML).toBe(FIXTURES[5]);
    });
  });

  test("Class Spread", () => {
    S.root(() => {
      const template = h("#main", [
        h("div.a", {class:'b'})
      ])();
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML).toBe(FIXTURES[6]);
    });
  });
});
