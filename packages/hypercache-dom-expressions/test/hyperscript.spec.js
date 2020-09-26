import * as S from "s-js";
import { createVDomEvaluator, h } from "../dist/hypercache-dom-expressions";
import * as r from "dom-expressions/src/runtime";

const [$, once] = createVDomEvaluator(r);

const FIXTURES = [
  '<div id="main"><h1>Welcome</h1><span style="color: rgb(85, 85, 85);">555</span><label class="name" for="entry">Edit:</label><input id="entry" type="text"></div>',
  '<div id="main" class="selected" refset="true"><h1 title="hello" style="background-color: red;"><a href="/">Welcome</a></h1></div>',
  '<div id="main"><button>Click Bound</button><button>Click Delegated</button><button>Click Listener</button></div>',
  "<div>First</div>middle<div>Last</div>",
  '<div id="main"><div>John R.<span>Smith</span></div></div>',
  '<div id="main"><div>John R.</div><span>Smith</span></div>',
  '<div></div>'
];

describe("Test HyperScript", () => {
  test("Simple Elements", () => {
    const template = once(h("div", { id: "main" }, [
      h("h1", "Welcome"),
      h("span", { style: "color: #555" }, 555),
      h("label", { class:"name", for: "entry" }, "Edit:"),
      h("input", { id: "entry", type: "text" })
    ]));
    expect(template.outerHTML).toBe(FIXTURES[0]);
  });

  test("Attribute Expressions", () => {
    const selected = S.data(true),
      welcoming = S.data("hello");
    let link;

    S.root(() => {
      const template = once(
        h("div", { id: "main", classList: () => ({ selected: selected() }), ref: el => el.setAttribute("refset", "true") },
          h("h1", { title: welcoming, style: () => ({ "background-color": "red" }) },
            h("a", { href: "/", ref: r => (link = r) }, "Welcome")
          )
      ));
      expect(template.outerHTML).toBe(FIXTURES[1]);
    });
  });

  test("Event Expressions", () => {
    const exec = {};

    const template = once(h("div", { id: "main" }, [
      h("button", { onclick: () => (exec.bound = true) }, "Click Bound"),
      h("button", { onClick: () => (exec.delegated = true) }, "Click Delegated"),
      h("button", { on: { click: () => (exec.listener = true) } }, "Click Listener")
    ]));
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
      const template = [once(h("div", "First")), inserted, once(h("div", "Last"))];
      const div = document.createElement("div");
      r.insert(div, template);
      expect(div.innerHTML).toBe(FIXTURES[3]);
    });
  });

  test("Components", () => {
    const Comp = $(props => h("div", () => props.name + " " + props.middle, props.children));
    S.root(() => {
      const template = once(h("div", {id:"main"}, [
        h(Comp, { name: () => "John", middle: "R." }, () => once(h("span", "Smith")))
      ]));
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML).toBe(FIXTURES[4]);
    });
  });

  test("Components with fragments", () => {
    const Comp = $(props => [h("div", () => props.name + " " + props.middle), props.children]);
    S.root(() => {
      const template = once(h("div", {id:"main"}, 
        h(Comp, { name: () => "John", middle: "R."}, () => once(h("span", "Smith")))
      ));
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML).toBe(FIXTURES[5]);
    });
  });

  test("Empty h", () => {
      const template = once(h("div"));
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML).toBe(FIXTURES[6]);
  });
});
