import { createRoot, createSignal, flush } from "@solidjs/signals";
import { createHTML } from "../dist/lit-dom-expressions";
import * as r from "dom-expressions/src/client";

/** @type {{ bodyFunc: string }[]} */
const context = [];
const html = createHTML(r, { functionBuilder: (...args) => {
  const ctx = context.pop();
  if (ctx) {
    expect(args[args.length - 1].replace(/_\$el\d+/g, '_$el')).toBe(ctx.bodyFunc.replace(/_\$el\d+/g, '_$el'));
  }
  return new Function(...args);
}});

class ValueAttributeOnlyElement extends HTMLElement {
  constructor() {
    super();
    this.setterCalls = 0;
    this.propValue = undefined;
  }

  set value(value) {
    this.setterCalls++;
    this.propValue = value;
  }

  get value() {
    return this.propValue;
  }
}

customElements.get("dx-value-attribute-only") ||
  customElements.define("dx-value-attribute-only", ValueAttributeOnlyElement);

const FIXTURES = /** @type {const} */ ([
  '<div id="main"><!-- this is a comment --><h1 random="">Welcome</h1><span style="color: rgb(85, 85, 85);">555</span><label class="name" for="entry">Edit:</label><input id="entry" type="text" readonly=""></div>',
  '<div id="main" refset="true" class="selected also" title="hi"><h1 class="hello" title="hello John Smith" style="background-color: red;"><a href="/">Welcome</a></h1></div>',
  '<div id="main"><button>Click Bound</button><button>Click Delegated</button><button>Click Listener</button></div>',
  "<div>First</div>middle<p>after1</p><div>Last</div><p>after2</p>",
  '<div id="main" title="hi"><div>John R.<span>Smith</span></div><div>After</div></div>',
  "<div>John R.<span>Smith</span></div>",
  "<div><div>Hi</div></div>",
  "<div><b>Hello, my name is: <i>John</i></b></div>",
  "<style>.something{color:red}</style>",
  '<div class="second"></div>'
]);

describe("Test HTML", () => {
  test("Simple Elements", () => {
    const template = html`
      <div id="main">
        <!-- this is a comment -->
        <h1 random>Welcome</h1>
        <span style="color: rgb(85, 85, 85);">${555}</span>
        <label class="name" for="entry">Edit:</label>
        <input id="entry" type="text" readonly=${true} />
      </div>
    `;
    expect(template.outerHTML).toBe(FIXTURES[0]);
  });

  test("Attribute Expressions", () => {
    const [selected] = createSignal(true),
      [welcoming] = createSignal("hello");
    let link;

    createRoot(() => {
      const template = html`
        <div
          id="main"
          class=${() => ({ "selected also": selected(), not: false })}
          ref=${el => {
            el.setAttribute("refset", "true");
          }}
          ...${() => ({ title: "hi" })}
        >
          <h1
            class=${welcoming}
            title="${welcoming} John ${"Smith"}"
            style=${() => ({ "background-color": "red" })}
          >
            <a href="/" ref=${r => (link = r)}>Welcome</a>
          </h1>
        </div>
      `;
      expect(template.outerHTML).toBe(FIXTURES[1]);
    });
  });

  test("Event Expressions", () => {
    const exec = {};

    const template = html`
      <div id="main">
        <button onclick=${() => (exec.bound = true)}>Click Bound</button>
        <button onClick=${[v => (exec.delegated = v), true]}>
          Click Delegated
        </button>
        <button on:click=${() => (exec.listener = true)}>
          Click Listener
        </button>
      </div>
    `;
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
    const [inserted] = createSignal("middle"),
      [after1] = createSignal("after1"),
      [after2] = createSignal("after2");

    createRoot(() => {
      const template = html`
        <div>First</div>
        ${inserted}
        <p>${after1}</p>
        <div>Last</div>
        <p>${after2}</p>
      `;
      const div = document.createElement("div");
      r.insert(div, template);
      expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[3]);
    });
  });

  test("Components", () => {
    const Comp = props =>
      html` <div>${() => props.name + " " + props.middle}${props.children}</div> `;
    createRoot(() => {
      const template = html`
        <div id="main" ...${() => ({ title: "hi" })}>
          <${Comp} name=${() => "John"} middle="R."><span>Smith</span><//>
          <div>After</div>
        </div>
      `;
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[4]);
    });
  });

  test("Top Level Components", () => {
    const Comp = props =>
      html` <div>${() => props.name + " " + props.middle}${props.children}</div> `;
    createRoot(() => {
      const template = html` <${Comp} name=${() => "John"} middle="R."><span>Smith</span><//> `;
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[5]);
    });
  });

  test("Nested Components", () => {
    const Comp = props => html` <div>${() => props.children}</div> `;
    createRoot(() => {
      const template = html`<${Comp}><${Comp}>Hi<//><//> `;
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[6]);
    });
  });

  test("Nested Components 2", () => {
    const Switch = props => props.children[0].children;
    const Match = props => props;
    createRoot(() => {
      const template = html`<div>
        <${Switch}>
          <${Match} when=${1}>
            <div>Hi</div>
          <//>
          <${Match} when=${2}>
            <div>Morris</div>
          <//>
          <${Match} when=${3}>
            <p>Jamie</p>
          <//>
        <//>
      </div>`;
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[6]);
    });
  });

  test("Test whitespace trim", () => {
    const name = "John";
    const template = html`
      <div>
        <b>Hello, my name is: <i> ${name}</i></b>
      </div>
    `;
    const div = document.createElement("div");
    div.appendChild(template);
    expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[7]);
  });

  test("multi-line, strange-but-valid, and edge-case attributes", () => {
    // This tests some attributes that previously did not work (but not all of
    // them, because html template tag still stumbles on the uncommon ones
    // (TODO)), detailed in
    // https://github.com/ryansolid/dom-expressions/issues/143 and
    // https://github.com/ryansolid/html-parse-string/issues/3

    /** @type {HTMLDivElement} */
    // prettier-ignore
    // We need to not format this HTML code otherwise prettier changes or even breaks the special cases we're testing.
    const div = html`
      <div
        multiline="
          foo
          bar
        "
        multi-line="
          foo
          bar
        "
        lorem ipsum these-all-need-to-be-on-the-same-line
        baz=123=456
        #$%=123
      ></div>
    `;

    // TODO these attributes are parsed correctly by html-parse-string now, but
    // html template tag doesn't handle them well yet.
    // beep"boop
    // y-o=123"456=#$%
    // #$%'123-

    // It was previously creating attributes from each new line.
    expect(div.attributes.getNamedItem("foo")).toBe(null);
    expect(div.attributes.getNamedItem("bar")).toBe(null);

    // Such attributes should now be preserved.
    expect(div.attributes.getNamedItem("multiline")?.value).toBe(
      `
          foo
          bar
        `
    );

    expect(div.attributes.getNamedItem("multi-line")?.value).toBe(
      `
          foo
          bar
        `
    );

    expect(div.attributes.getNamedItem("lorem")?.value).toBe("");
    expect(div.attributes.getNamedItem("ipsum")?.value).toBe("");
    expect(div.attributes.getNamedItem("these-all-need-to-be-on-the-same-line")?.value).toBe("");
    expect(div.attributes.getNamedItem("baz")?.value).toBe("123=456");
    expect(div.attributes.getNamedItem("#$%")?.value).toBe("123");

    // TODO
    // expect(div.attributes.getNamedItem('beep"boop')?.value).toBe("");
    // expect(div.attributes.getNamedItem("y-o")?.value).toBe('123"456=#$%');
    // expect(div.attributes.getNamedItem("#$%'123-")?.value).toBe("");

    // ensure it handles `"` chars correctly
    const el = html`<lume-box uniforms='{ "iTime": { "value": 0 } }'></lume-box>`;

    expect(el.attributes.length).toBe(1);
    expect(el.attributes.uniforms?.value).toBe('{ "iTime": { "value": 0 } }');
  });

  test("Test style tag", () => {
    const color = "red";
    // prettier-ignore
    const template = html`
      <style>.something{color:${color}}</style>
    `;
    const div = document.createElement("div");
    div.appendChild(template);
    expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[8]);
  });

  test("Test double toggle class", () => {
    createRoot(() => {
      const [d, setD] = createSignal("first");
      const template = html`<div class=${() => ({ [d()]: true })} ></div>`;
      const div = document.createElement("div");
      div.appendChild(template);
      setD("second");
      flush();
      expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[9]);
    });
  });

  test("custom elements keep dynamic value on the attribute path", () => {
    createRoot(() => {
      const [value, setValue] = createSignal("initial");
      const el = html`<dx-value-attribute-only value=${value} />`;

      expect(el.getAttribute("value")).toBe("initial");
      expect(el.setterCalls).toBe(0);
      expect(el.value).toBeUndefined();

      setValue("next");
      flush();

      expect(el.getAttribute("value")).toBe("next");
      expect(el.setterCalls).toBe(0);
      expect(el.value).toBeUndefined();
    });
  });

  test("input keeps dynamic value on the property path", () => {
    createRoot(() => {
      const [value, setValue] = createSignal("initial");
      const input = html`<input value=${value} />`;

      expect(input.value).toBe("initial");
      expect(input.getAttribute("value")).toBe(null);

      setValue("next");
      flush();

      expect(input.value).toBe("next");
      expect(input.getAttribute("value")).toBe(null);
    });
  });

  test("Expressions in Comment", () =>{
    const name = "John";
    const template = html`<div>
      <!--<div name=${name} />-->
      <b>Hello, my name is: <i>${name}</i></b>
    </div>`;
    const div = document.createElement("div");
    div.appendChild(template);
    expect(div.innerHTML.replace(`<!--<div name="###"></div>-->`, "")).toBe(FIXTURES[7]);
  });

  // --- Previously uncovered branches ---

  // Templates with a standalone `<!-- ... -->` at the root go through
  // html-parse-string's comment-handling branch (res.name.startsWith('!--')).
  test("standalone HTML comment at top level parses without throwing", () => {
    expect(() =>
      html`<!-- just a static comment --><div>after</div>`
    ).not.toThrow();
  });

  // `xlink:href` is routed through `setAttributeNS` (one of the reserved
  // namespace slots in the runtime).
  test("xlink:href attribute uses setAttributeNS", () => {
    const href = "#icon-a";
    const xlinkNS = "http://www.w3.org/1999/xlink";
    // Use an SVG context so the attribute actually lands on a use element.
    const template = html`
      <svg>
        <use xlink:href=${href}></use>
      </svg>
    `;
    const use = template.querySelector("use");
    expect(use.getAttributeNS(xlinkNS, "href")).toBe("#icon-a");
  });

  // An `<img loading="lazy">` flags the tree as isImportNode=true (for
  // document.importNode bypass of some loading behavior).
  test("img with loading='lazy' parses without error", () => {
    expect(() =>
      html`<img src="/x.png" loading="lazy" />`
    ).not.toThrow();
  });

  test("iframe with loading='lazy' parses without error", () => {
    expect(() =>
      html`<iframe src="/frame.html" loading="lazy"></iframe>`
    ).not.toThrow();
  });

  // The `is=` attribute marks a builtin extension (customized built-ins),
  // another flag for the isImportNode path.
  test("element with is= attribute parses without error", () => {
    expect(() =>
      html`<button is="my-button">hello</button>`
    ).not.toThrow();
  });

  // Components with a single expression child take the "children as single
  // accessor" branch (processComponent line: `children: () => exprs[...]`).
  test("component with a single expression child uses the children accessor shortcut", () => {
    const Comp = props => {
      const div = document.createElement("div");
      const child = typeof props.children === "function" ? props.children() : props.children;
      div.appendChild(child);
      return div;
    };
    const kid = document.createElement("b");
    kid.textContent = "inner";
    const template = html`<${Comp}>${kid}<//>`;
    expect(template.firstChild).toBe(kid);
  });

  // Component that mixes explicit props with a spread (`...${obj}`) hits
  // the propGroups.push branch where the running group gets closed and a
  // new one is started for the spread argument.
  test("component with mixed explicit + spread props merges both", () => {
    let captured;
    const Comp = props => {
      captured = props;
      const div = document.createElement("div");
      div.textContent = props.a + "|" + props.b + "|" + props.c;
      return div;
    };
    const template = html`<${Comp} a="A" ...${{ b: "B" }} c="C"/>`;
    expect(template.textContent).toBe("A|B|C");
    expect(captured.a).toBe("A");
    expect(captured.b).toBe("B");
    expect(captured.c).toBe("C");
  });

  // Element spread mixed with static attributes — exercises the branch
  // where an attribute is static (goes to newAttrs) alongside the ### spread.
  test("element with static attribute alongside spread keeps the static attribute", () => {
    const template = html`<div id="kept" ...${{ class: "extra" }}>body</div>`;
    expect(template.getAttribute("id")).toBe("kept");
    expect(template.classList.contains("extra")).toBe(true);
  });

  // Fragment with expressions inside a comment hits the
  // `child.content.split("###")` count loop in parseNode's fragment
  // comment branch.
  test("top-level comment with interpolations in a multi-root template", () => {
    const a = "one";
    const b = "two";
    expect(() =>
      html`
        <!-- ${a} and ${b} -->
        <span>left</span>
        <span>right</span>
      `
    ).not.toThrow();
  });

  // createHTML's default functionBuilder option (`new Function(...)`)
  // triggers when the options arg is omitted.
  test("createHTML with default functionBuilder option builds templates", () => {
    const html2 = createHTML(r);
    const template = html2`<div>default builder</div>`;
    expect(template.outerHTML).toBe("<div>default builder</div>");
  });

  // `prop:name` — reserved-namespace attribute routes through parseKeyValue's
  // colon-split branch (name = parts[1]; namespace = parts[0]; then the
  // `namespace === "prop"` tail assigns the value as a DOM property).
  test("prop:name attribute sets a DOM property directly", () => {
    const payload = { answer: 42 };
    const template = html`<div prop:customData=${payload}>x</div>`;
    expect(template.customData).toBe(payload);
    expect(template.hasAttribute("customData")).toBe(false);
  });
});
