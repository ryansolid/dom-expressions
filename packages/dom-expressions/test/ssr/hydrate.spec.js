/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import * as r2 from "../../src/server";
import { createSignal, flush } from "@solidjs/signals";

globalThis._$HY = { events: [], completed: new WeakSet() };

describe("r.hydrate", () => {
  const container = document.createElement("div"),
    _tmpl$ = r.template(`<span><!--#--><!--/--> John</span>`),
    _tmpl$2 = r.template(`<div>First</div>`),
    _tmpl$3 = r.template(`<div>Last</div>`);
  document.body.appendChild(container);
  let rendered;

  it("hydrates simple text", () => {
    rendered = r2.renderToString(() =>
      r2.ssr(["<span", "><!--#-->", "<!--/--> John</span>"], r2.ssrHydrationKey(), r2.escape("Hi"))
    );
    expect(rendered).toBe(`<span _hk=0><!--#-->Hi<!--/--> John</span>`);
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.firstChild,
      el3 = el2.nextSibling,
      el4 = el3.nextSibling;

    r.hydrate(() => {
      const leadingExpr = (function () {
        const _el$ = r.getNextElement(_tmpl$),
          _el$2 = _el$.firstChild,
          [_el$3, _co$] = r.getNextMarker(_el$2.nextSibling);
        r.insert(_el$, "Hi", _el$3, _co$);
        r.runHydrationEvents(_el$.getAttribute("_hk"));
        return _el$;
      })();
      r.insert(container, leadingExpr, undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);
    expect(container.innerHTML).toBe(`<span _hk="0"><!--#-->Hi<!--/--> John</span>`);
    expect(container.firstChild).toBe(el1);
    expect(el1.firstChild).toBe(el2);
    expect(el2.nextSibling).toBe(el3);
    expect(el3.nextSibling).toBe(el4);
  });

  it("hydrates fragments", () => {
    rendered = r2.renderToString(() => [
      r2.ssr(["<div", ">First</div>"], r2.ssrHydrationKey()),
      "middle",
      r2.ssr(["<div", ">Last</div>"], r2.ssrHydrationKey())
    ]);
    expect(rendered).toBe(`<div _hk=0>First</div>middle<div _hk=1>Last</div>`);
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.nextSibling,
      el3 = el2.nextSibling;

    r.hydrate(() => {
      const multiExpression = [
        (function () {
          const _el$ = r.getNextElement(_tmpl$2);
          r.runHydrationEvents(_el$.getAttribute("_hk"));
          return _el$;
        })(),
        "middle",
        (function () {
          const _el$ = r.getNextElement(_tmpl$3);
          r.runHydrationEvents(_el$.getAttribute("_hk"));
          return _el$;
        })()
      ];
      r.insert(container, multiExpression, undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);
    expect(container.innerHTML).toBe(
      `<div _hk="0">First</div>middle<div _hk="1">Last</div>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.nextSibling).toEqual(el2);
    expect(el1.nextSibling.nextSibling).toBe(el3);
  });

  it("hydrates fragment with adjacent text items", () => {
    rendered = r2.renderToString(() => ["prefix", "hello"]);
    expect(rendered).toBe("prefix<!--!$-->hello");

    container.innerHTML = rendered;
    expect(container.childNodes.length).toBe(3);
    const prefixNode = container.firstChild;
    const helloNode = container.lastChild;

    r.hydrate(() => {
      r.insert(container, ["prefix", "hello"], undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);

    expect(container.innerHTML).toBe("prefixhello");
    expect(container.childNodes.length).toBe(2);
    expect(container.firstChild).toBe(prefixNode);
    expect(container.lastChild).toBe(helloNode);
  });

  it("updates reactively after hydrating fragment with adjacent text", () => {
    rendered = r2.renderToString(() => ["prefix", "hello"]);
    container.innerHTML = rendered;

    const prefixNode = container.firstChild;
    const helloNode = container.lastChild;

    let setter;
    r.hydrate(() => {
      const [s, set] = createSignal("hello");
      setter = set;
      r.insert(container, ["prefix", r.memo(() => s())], undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);

    expect(container.innerHTML).toBe("prefixhello");
    expect(container.firstChild).toBe(prefixNode);
    expect(container.lastChild).toBe(helloNode);

    setter("world");
    flush();
    expect(container.innerHTML).toBe("prefixworld");
  });

  it("skips hydrating simple text", () => {
    rendered = r2.renderToString(() =>
      r2.createComponent(r2.NoHydration, {
        get children() {
          return r2.ssr(
            ["<span", "><!--#-->", "<!--/--> John</span>"],
            r2.ssrHydrationKey(),
            r2.escape("Hi")
          );
        }
      })
    );
    expect(rendered).toBe(`<span><!--#-->Hi<!--/--> John</span>`);
  });
});
