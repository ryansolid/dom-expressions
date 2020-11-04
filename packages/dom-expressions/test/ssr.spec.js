import * as r from "../src/runtime";
import * as r2 from "../src/server/asyncSSR";
import * as S from "s-js";

const fixture = `<div id="main" data-id="12" aria-role="button" class="selected" style="color:red"><h1 custom-attr="1" disabled="" title="Hello John" style="background-color:red" class="selected"><a href="/">Welcome</a></h1></div>`;
const fixture2 = `<span> Hello &lt;div/> </span>`;

const Comp1 = () => {
  const selected = S.data(true),
    welcoming = S.data("Hello John"),
    color = S.data("red"),
    results = {
      "data-id": "12",
      "aria-role": "button"
    },
    dynamic = () => ({
      "custom-attr": "1"
    });

  return r2.ssr`<div id="main" ${r2.ssrSpread(results, false, true)} class="${r2.ssrClassList({
    selected: selected()
  })}" style="${r2.ssrStyle({
    color: color()
  })}"><h1 ${r2.ssrSpread(() => dynamic(), false, true)} disabled="" title="${() =>
    welcoming()}" style="${() =>
    r2.ssrStyle({
      "background-color": color()
    })}" class="${() =>
    r2.ssrClassList({
      selected: selected()
    })}"><a href="/">Welcome</a></h1></div>`;
};

const Comp2 = () => {
  const greeting = "Hello",
    name="<div/>"
  return r2.ssr`<span> ${r2.escape(greeting)} ${r2.escape(name)} </span>`;
}

describe("renderToString", () => {
  it("renders as expected", async () => {
    let res = r2.renderToString(Comp1);
    expect(res).toBe(fixture);
    res = r2.renderToString(Comp2);
    expect(res).toBe(fixture2);
  });
});
