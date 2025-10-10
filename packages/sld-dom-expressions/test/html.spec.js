import { createRoot, createSignal, flush } from "@solidjs/signals";
import { createSLDRuntime } from "../dist/sld-dom-expressions";
import * as r from "dom-expressions/src/client";

const createSld = createSLDRuntime(r);

/** @type {{ bodyFunc: string }[]} */
const context = [];
const sld = createSld(r, { functionBuilder: (...args) => {
  const ctx = context.pop();
  if (ctx) {
    expect(args[args.length - 1].replace(/_\$el\d+/g, '_$el')).toBe(ctx.bodyFunc.replace(/_\$el\d+/g, '_$el'));
  }
  return new Function(...args);
}});

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
    const template = sld`
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
      const template = sld`
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

    const template = sld`
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
      const template = sld`
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
      sld` <div>${() => props.name + " " + props.middle}${props.children}</div> `;
    createRoot(() => {
      const template = sld.define({Comp})`
        <div id="main" ...${() => ({ title: "hi" })}>
          <Comp name=${() => "John"} middle="R."><span>Smith</span></Comp>
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
      sld` <div>${() => props.name + " " + props.middle}${props.children}</div> `;
    createRoot(() => {
      const template = sld.define({Comp})` <Comp name=${() => "John"} middle="R."><span>Smith</span></Comp> `;
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[5]);
    });
  });

  test("Nested Components", () => {
    const Comp = props => sld` <div>${() => props.children}</div> `;
    createRoot(() => {
      const template = sld.define({Comp})`<Comp><Comp>Hi</Comp></Comp> `;
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[6]);
    });
  });

  test("Nested Components 2", () => {
    const Switch = props => props.children[0].children;
    const Match = props => props;
    createRoot(() => {
      const template = sld.define({Switch,Match})`<div>
        <Switch>
          <Match when=${1}>
            <div>Hi</div>
          </Match>
          <Match when=${2}>
            <div>Morris</div>
          </Match>
          <Match when=${3}>
            <p>Jamie</p>
          </Match>
        </Switch>
      </div>`;
      const div = document.createElement("div");
      div.appendChild(template);
      expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[6]);
    });
  });

  test("Test whitespace trim", () => {
    const name = "John";
    const template = sld`
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
    const div = sld`
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
    const el = sld`<lume-box uniforms='{ "iTime": { "value": 0 } }'></lume-box>`;

    expect(el.attributes.length).toBe(1);
    expect(el.attributes.uniforms?.value).toBe('{ "iTime": { "value": 0 } }');
  });

  test("Test style tag", () => {
    const color = "red";
    // prettier-ignore
    const template = sld`
      <style>.something{color:${color}}</style>
    `;
    const div = document.createElement("div");
    div.appendChild(template);
    expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[8]);
  });

  test("Test double toggle class", () => {
    createRoot(() => {
      const [d, setD] = createSignal("first");
      const template = sld`<div class=${() => ({ [d()]: true })} />`;
      const div = document.createElement("div");
      div.appendChild(template);
      setD("second");
      flush();
      expect(div.innerHTML.replace(/<!--#-->/g, "")).toBe(FIXTURES[9]);
    });
  });

  test("Expressions in Comment", () =>{
    const name = "John";
    const template = sld`<div>
      <!--<div name=${name} />-->
      <b>Hello, my name is: <i>${name}</i></b>
    </div>`;
    const div = document.createElement("div");
    div.appendChild(template);
    expect(div.innerHTML.replace(`<!--<div name="###"></div>-->`, "")).toBe(FIXTURES[7]);
  });

  test("Directive use", () =>{
    function directive(el, value) {
      el.style.backgroundColor = 'red';
      el.innerHTML += value();
    }
    context.push({
      bodyFunc: 'const _$el1 = tmpls[0].content.firstChild.cloneNode(true),\n'
      + '_$el2 = _$el1.firstChild,\n'
      + '_$el3 = _$el2.firstChild;\n'
      + 'typeof exprs[0] === "function" ? r.use(exprs[0], _$el2, exprs[1]) : (()=>{throw new Error("use:### must be a function")})();\n'
      + 'return _$el1;\n'
    });
    const template = sld`<div><div use:${directive}=${() => "world!"}>Hello <//><//> `;
    expect(template.outerHTML).toBe('<div><div style="background-color: red;">Hello world!</div></div>');
  });
});
