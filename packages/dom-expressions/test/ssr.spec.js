import * as r from "../src/runtime";
import * as S from "s-js";

const fixture = `<div id="main" data-id="12" aria-role="button" class="selected" style="color: red;"><h1 custom-attr="1" disabled="" title="Hello John" style="background-color: red;" class="selected"><a href="/">Welcome</a></h1></div>`;

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

  return r.ssr`<div id="main" ${r.ssrSpread(results, false, true)} class="${r.ssrClassList({
    selected: selected()
  })}" style="${r.ssrStyle({
    color: color()
  })}"><h1 ${r.ssrSpread(() => dynamic(), false, true)} disabled="" title="${() =>
    welcoming()}" style="${() =>
    r.ssrStyle({
      "background-color": color()
    })}" class="${() =>
    r.ssrClassList({
      selected: selected()
    })}"><a href="/">Welcome</a></h1></div>`;
};

describe("renderToString", () => {
  it("renders as expected", async () => {
    const res = await r.renderToString(Comp1);
    expect(res).toBe(fixture);
  });
});
