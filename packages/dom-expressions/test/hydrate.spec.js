import * as r from "../src/client";
import * as r2 from "../src/server";

globalThis._$HYDRATION = {};

function setHydrateContext(context) {
  globalThis._$HYDRATION.context = context;
}

function nextHydrateContext() {
  return globalThis._$HYDRATION && globalThis._$HYDRATION.context
    ? {
        id: `${globalThis._$HYDRATION.context.id}.${globalThis._$HYDRATION.context.count++}`,
        count: 0
      }
    : undefined;
}

describe("r.hydrate", () => {
  const container = document.createElement("div"),
    _tmpl$ = r.template(`<span><!--#--><!--/--> John</span>`),
    _tmpl$2 = r.template(`<div>First</div>`),
    _tmpl$3 = r.template(`<div>Last</div>`);
  let result, rendered;

  it("hydrates simple text", () => {
    rendered = r2.renderToString(() =>
      r2.ssr(
        ['<span data-hk="', '"><!--#-->', "<!--/--> John</span>"],
        r2.getHydrationKey(),
        r2.escape("Hi")
      )
    ).split("<script>")[0];
    expect(rendered).toBe(`<span data-hk="0"><!--#-->Hi<!--/--> John</span>`);
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
        r.runHydrationEvents(_el$.getAttribute("data-hk"));
        return _el$;
      })();
      r.insert(container, leadingExpr, undefined, [...container.childNodes]);
    }, container);
    expect(container.innerHTML).toBe(`<span data-hk="0"><!--#-->Hi<!--/--> John</span>`);
    expect(container.firstChild).toBe(el1);
    expect(el1.firstChild).toBe(el2);
    expect(el2.nextSibling).toBe(el3);
    expect(el3.nextSibling).toBe(el4);
  });

  it("hydrates with an updated timestamp", () => {
    const time = Date.now();
    rendered = r2.renderToString(() =>
      r2.ssr(
        ['<span data-hk="', '"><!--#-->', "<!--/--> John</span>"],
        r2.getHydrationKey(),
        r2.escape(time)
      )
    ).split("<script>")[0];
    expect(rendered).toBe(`<span data-hk="0"><!--#-->${time}<!--/--> John</span>`);
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.firstChild,
      el3 = el2.nextSibling,
      el4 = el3.nextSibling;

    const updatedTime = Date.now();
    r.hydrate(() => {
      const leadingExpr = (function () {
        const _el$ = r.getNextElement(_tmpl$),
          _el$2 = _el$.firstChild,
          [_el$3, _co$] = r.getNextMarker(_el$2.nextSibling);
        r.insert(_el$, updatedTime, _el$3, _co$);
        r.runHydrationEvents(_el$.getAttribute("data-hk"));
        return _el$;
      })();
      r.insert(container, leadingExpr, undefined, [...container.childNodes]);
    }, container);
    expect(container.innerHTML).toBe(
      `<span data-hk="0"><!--#-->${updatedTime}<!--/--> John</span>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.firstChild).toBe(el2);
    expect(el2.nextSibling).toBe(el3);
    expect(el3.nextSibling).toBe(el4);
  });

  it("hydrates fragments", () => {
    rendered = r2.renderToString(() => [
      r2.ssr(['<div data-hk="', '">First</div>'], r2.getHydrationKey()),
      "middle",
      r2.ssr(['<div data-hk="', '">Last</div>'], r2.getHydrationKey())
    ]).split("<script>")[0];
    expect(rendered).toBe(`<div data-hk="0">First</div>middle<div data-hk="1">Last</div>`);
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.nextSibling,
      el3 = el2.nextSibling;

    r.hydrate(() => {
      const multiExpression = [
        (function () {
          const _el$ = r.getNextElement(_tmpl$2);
          r.runHydrationEvents(_el$.getAttribute("data-hk"));
          return _el$;
        })(),
        "middle",
        (function () {
          const _el$ = r.getNextElement(_tmpl$3);
          r.runHydrationEvents(_el$.getAttribute("data-hk"));
          return _el$;
        })()
      ];
      r.insert(container, multiExpression, undefined, [...container.childNodes]);
    }, container);
    expect(container.innerHTML).toBe(
      `<div data-hk="0">First</div>middle<div data-hk="1">Last</div>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.nextSibling).toEqual(el2);
    expect(el1.nextSibling.nextSibling).toBe(el3);
  });

  it("timeouts SSR asynchronous render", async () => {
    let errored;
    try {
      result = r2.renderToStringAsync(
        async () => {
          const multiExpression = [
            r2.ssr`<div data-hk="${r2.getHydrationKey()}">First</div>`,
            r2.ssr`<div data-hk="${r2.getHydrationKey()}">Last</div>`
          ];
          await new Promise(r => setTimeout(r, 20));
          return multiExpression;
        },
        { timeoutMs: 0 }
      );
      rendered = await result;
    } catch {
      errored = true;
    }
    expect(errored).toBe(true);
  });
});
