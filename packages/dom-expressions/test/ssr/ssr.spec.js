import * as r from "../../src/server";
import * as S from "s-js";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

const fixture = `<div id="main" data-id="12" aria-role="button" checked class="selected" style="color:red"><h1 custom-attr="1" disabled title="Hello John" style="background-color:red" class="selected"><a href="/">Welcome</a></h1></div>`;
const fixture2 = `<span> Hello &lt;div/> </span>`;
const fixture3 = `<span> Hello &lt;div/><script nonce=\"1a2s3d4f5g\">((e,t,o={})=>{t=e=>e&&e.hasAttribute&&(e.hasAttribute(\"data-hk\")?e:t(e.host&&e.host instanceof Node?e.host:e.parentNode)),[\"click\",\"input\"].forEach((o=>document.addEventListener(o,(o=>{let s=o.composedPath&&o.composedPath()[0]||o.target,n=t(s);n&&!e.completed.has(n)&&e.events.push([n,o])})))),e.init=(e,t,s)=>{o[e]=[new Promise(((e,o)=>(t=e,s=o))),t,s]},e.set=(e,t,s,n)=>{(n=o[e])&&(s?n[2](s):n[1](t)),o[e]=[t]},e.unset=e=>{delete o[e]},e.load=(e,t)=>{if(t=o[e])return t[0]}})(window._$HY||(_$HY={events:[],completed:new WeakSet}))</script><!xs><link rel=\"modulepreload\" href=\"chunk.js\"></span>`;

const Comp1 = () => {
  const selected = S.data(true),
    welcoming = S.data("Hello John"),
    color = S.data("red"),
    results = {
      "data-id": "12",
      "aria-role": "button",
      onClick: () => console.log("never"),
      get checked() {
        return selected();
      }
    },
    dynamic = () => ({
      "custom-attr": "1"
    });

  return r.ssr`<div id="main" ${r.ssrSpread(results, false, true)} class="${r.ssrClassList({
    selected: selected()
  })}" style="${r.ssrStyle({
    color: color()
  })}"${r.ssrBoolean("disabled", !selected())}><h1 ${r.ssrSpread(
    () => dynamic(),
    false,
    true
  )}${r.ssrBoolean("disabled", selected())} title="${() => welcoming()}" style="${() =>
    r.ssrStyle({
      "background-color": color()
    })}" class="${() =>
    r.ssrClassList({
      selected: selected()
    })}"><a href="/">Welcome</a></h1></div>`;
};

const Comp2 = () => {
  const greeting = "Hello",
    name = "<div/>";
  return r.ssr`<span> ${r.escape(greeting)} ${r.escape(name)} </span>`;
};

const Comp3 = () => {
  const greeting = "Hello",
    name = "<div/>";
  return r.ssr`<span> ${r.escape(greeting)} ${r.escape(name)}${r.HydrationScript()}${r.Assets({
    key: "ASSET",
    get children() {
      return r.ssr(`<link rel="modulepreload" href="chunk.js">`)
    }
  })}</span>`;
};

describe("renderToString", () => {
  it("renders as expected", async () => {
    let res = r.renderToString(Comp1);
    expect(res).toBe(fixture);
    res = r.renderToString(Comp2);
    expect(res).toBe(fixture2);
    res = r.renderToString(Comp3, { nonce: "1a2s3d4f5g" });
    expect(res).toBe(fixture3);
  });
});

describe("pipeToNodeWritable", () => {
  it("renders as expected", done => {
    const chunks = [];
    r.pipeToNodeWritable(Comp2, {
      write(v) {
        chunks.push(v);
      },
      end() {
        expect(chunks.join("")).toBe(fixture2);
        done();
      }
    });
  });
});

describe("pipeToWritable", () => {
  it("renders as expected", done => {
    const chunks = [];
    r.pipeToWritable(Comp2, {
      getWriter() {
        return {
          write(v) {
            chunks.push(v);
          },
          releaseLock() {}
        };
      },
      close() {
        expect(chunks.join("")).toBe(fixture2);
        done();
      }
    });
  });
});
