import * as r from "../src/server/asyncSSR";
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

  return r.ssr`<div id="main" ${r.spread(results, false, true)} class="${r.classList({
    selected: selected()
  })}" style="${r.style({
    color: color()
  })}"><h1 ${r.spread(() => dynamic(), false, true)} disabled="" title="${() =>
    welcoming()}" style="${() =>
    r.style({
      "background-color": color()
    })}" class="${() =>
    r.classList({
      selected: selected()
    })}"><a href="/">Welcome</a></h1></div>`;
};

const Comp2 = () => {
  const greeting = "Hello",
    name="<div/>"
  return r.ssr`<span> ${r.escape(greeting)} ${r.escape(name)} </span>`;
}

describe("renderToString", () => {
  it("renders as expected", async () => {
    let res = r.renderToString(Comp1);
    expect(res).toBe(fixture);
    res = r.renderToString(Comp2);
    expect(res).toBe(fixture2);
  });
});
