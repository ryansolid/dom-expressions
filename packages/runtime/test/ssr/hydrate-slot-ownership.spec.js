/**
 * @jest-environment jsdom
 */
// Post-hydration slot migration starts from claimed DOM nodes, which have not
// passed through the client insertion paths that apply $$SLOT ownership tags.
import * as r from "../../src/client";
import * as r2 from "../../src/server";
import { createSignal, flush } from "@solidjs/signals";

globalThis._$HY = { events: [], completed: new WeakSet() };

describe("post-hydration cross-slot migration (adjacent marker-delimited slots)", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);

  beforeEach(() => {
    globalThis._$HY = { events: [], completed: new WeakSet() };
    container.innerHTML = "";
  });

  it("single claimed node migrates forward to the adjacent slot", () => {
    // Server HTML matching the client evaluation order:
    // <div _hk=1><!--$--><b _hk=0>X</b><!--/--><!--$--><!--/--></div>
    const rendered = r2.renderToString(() => {
      const inner = r2.ssr(["<b", ">X</b>"], r2.ssrHydrationKey());
      return r2.ssr(
        ["<div", "><!--$-->", "<!--/--><!--$-->", "<!--/--></div>"],
        r2.ssrHydrationKey(),
        inner,
        ""
      );
    });
    container.innerHTML = rendered;
    const serverB = container.querySelector("b");

    const _tmplB = r.template(`<b>X</b>`);
    const _tmplDiv = r.template(`<div><!$><!/><!$><!/></div>`);

    let setter, el;
    r.hydrate(() => {
      const [right, setRight] = createSignal(false);
      setter = setRight;
      el = r.getNextElement(_tmplB);
      const _el$ = r.getNextElement(_tmplDiv),
        _el$2 = _el$.firstChild,
        [_el$3, _co$] = r.getNextMarker(_el$2.nextSibling),
        _el$4 = _el$3.nextSibling,
        [_el$5, _co$2] = r.getNextMarker(_el$4.nextSibling);
      r.insert(
        _el$,
        r.memo(() => (right() ? null : el)),
        _el$3,
        _co$
      );
      r.insert(
        _el$,
        r.memo(() => (right() ? el : null)),
        _el$5,
        _co$2
      );
      r.insert(container, _el$, undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);

    expect(el).toBe(serverB);
    expect(container.textContent).toBe("X");

    setter(true);
    flush();
    expect(container.textContent).toBe("X");
    expect(container.contains(el)).toBe(true);

    setter(false);
    flush();
    expect(container.textContent).toBe("X");
    expect(container.contains(el)).toBe(true);
  });

  it("two claimed nodes exchange between adjacent slots", () => {
    // Server HTML matching the client evaluation order:
    // <div _hk=2><!--$--><span _hk=0>1</span><!--/--><!--$--><b _hk=1>2</b><!--/--></div>
    const rendered = r2.renderToString(() => {
      const innerSpan = r2.ssr(["<span", ">1</span>"], r2.ssrHydrationKey());
      const innerBold = r2.ssr(["<b", ">2</b>"], r2.ssrHydrationKey());
      return r2.ssr(
        ["<div", "><!--$-->", "<!--/--><!--$-->", "<!--/--></div>"],
        r2.ssrHydrationKey(),
        innerSpan,
        innerBold
      );
    });
    container.innerHTML = rendered;
    const serverSpan = container.querySelector("span");
    const serverBold = container.querySelector("b");

    const _tmplSpan = r.template(`<span>1</span>`);
    const _tmplBold = r.template(`<b>2</b>`);
    const _tmplDiv = r.template(`<div><!$><!/><!$><!/></div>`);

    let setter, el1, el2, div;
    r.hydrate(() => {
      const [swap, setSwap] = createSignal(false);
      setter = setSwap;
      el1 = r.getNextElement(_tmplSpan);
      el2 = r.getNextElement(_tmplBold);
      const _el$ = r.getNextElement(_tmplDiv),
        _el$2 = _el$.firstChild,
        [_el$3, _co$] = r.getNextMarker(_el$2.nextSibling),
        _el$4 = _el$3.nextSibling,
        [_el$5, _co$2] = r.getNextMarker(_el$4.nextSibling);
      div = _el$;
      r.insert(
        _el$,
        r.memo(() => (swap() ? el2 : el1)),
        _el$3,
        _co$
      );
      r.insert(
        _el$,
        r.memo(() => (swap() ? el1 : el2)),
        _el$5,
        _co$2
      );
      r.insert(container, _el$, undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);

    expect(el1).toBe(serverSpan);
    expect(el2).toBe(serverBold);
    expect(div.textContent).toBe("12");

    setter(true);
    flush();
    expect(div.textContent).toBe("21");

    setter(false);
    flush();
    expect(div.textContent).toBe("12");
  });
});
