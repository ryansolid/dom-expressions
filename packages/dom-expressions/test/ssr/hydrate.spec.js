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

  it("hydrates standalone head with static children", () => {
    rendered = r2.renderToString(() =>
      r2.ssr(
        ["<head", '><title>Test</title><meta charset="UTF-8"><link rel="stylesheet" href="/styles.css"></head>'],
        r2.ssrHydrationKey()
      )
    );
    expect(rendered).toBe('<head _hk=0><title>Test</title><meta charset="UTF-8"><link rel="stylesheet" href="/styles.css"></head>');

    const head = document.createElement("head");
    head.setAttribute("_hk", "0");
    const title = document.createElement("title");
    title.textContent = "Test";
    const meta = document.createElement("meta");
    meta.setAttribute("charset", "UTF-8");
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", "/styles.css");
    head.appendChild(title);
    head.appendChild(meta);
    head.appendChild(link);

    container.innerHTML = "";
    container.appendChild(head);

    r.hydrate(() => {
      const _el$ = r.getNextElement();
      const _el$2 = _el$.firstChild;
      const _el$3 = _el$2.nextSibling;
      const _el$4 = _el$3.nextSibling;
      r.insert(container, _el$, undefined, [...container.childNodes]);
      r.runHydrationEvents();
      return _el$;
    }, container);

    expect(container.firstChild).toBe(head);
    expect(head.firstChild).toBe(title);
    expect(title.nextSibling).toBe(meta);
    expect(meta.nextSibling).toBe(link);
  });

  it("hydrates head with dynamic expression", () => {
    const head = document.createElement("head");
    head.setAttribute("_hk", "0");
    const title = document.createElement("title");
    title.textContent = "Test";
    const startMarker = document.createComment("$");
    const dynamicLink = document.createElement("link");
    dynamicLink.setAttribute("rel", "stylesheet");
    dynamicLink.setAttribute("href", "/dynamic.css");
    const endMarker = document.createComment("/");
    head.appendChild(title);
    head.appendChild(startMarker);
    head.appendChild(dynamicLink);
    head.appendChild(endMarker);

    container.innerHTML = "";
    container.appendChild(head);

    let setter;
    r.hydrate(() => {
      const _el$ = r.getNextElement();
      const _el$2 = _el$.firstChild;
      const [_el$3, _co$] = r.getNextMarker(_el$2.nextSibling);
      const [s, set] = createSignal("dynamic.css");
      setter = set;
      r.insert(
        _el$,
        r.memo(() => {
          const href = s();
          const l = document.createElement("link");
          l.setAttribute("rel", "stylesheet");
          l.setAttribute("href", "/" + href);
          return l;
        }),
        _el$3,
        _co$
      );
      r.insert(container, _el$, undefined, [...container.childNodes]);
      r.runHydrationEvents();
      return _el$;
    }, container);

    expect(container.firstChild).toBe(head);
    expect(head.firstChild).toBe(title);

    setter("updated.css");
    flush();
    const updatedLink = head.querySelector('link[href="/updated.css"]');
    expect(updatedLink).toBeTruthy();
  });

  it("hydrates head as child of html using getNextMatch", () => {
    const html = document.createElement("html");
    html.setAttribute("_hk", "0");
    const head = document.createElement("head");
    const title = document.createElement("title");
    title.textContent = "Test";
    head.appendChild(title);
    const body = document.createElement("body");
    const div = document.createElement("div");
    div.textContent = "Hello";
    body.appendChild(div);
    html.appendChild(head);
    html.appendChild(body);

    container.innerHTML = "";
    container.appendChild(html);

    r.hydrate(() => {
      const _el$ = r.getNextElement();
      const _el$2 = r.getNextMatch(_el$.firstChild, "head");
      const _el$3 = _el$2.firstChild;
      const _el$4 = r.getNextMatch(_el$2.nextSibling, "body");
      const _el$5 = _el$4.firstChild;
      r.insert(container, _el$, undefined, [...container.childNodes]);
      r.runHydrationEvents();
      return _el$;
    }, container);

    expect(container.firstChild).toBe(html);
    expect(r.getNextMatch(html.firstChild, "head")).toBe(head);
    expect(head.firstChild).toBe(title);
    expect(r.getNextMatch(head.nextSibling, "body")).toBe(body);
    expect(body.firstChild).toBe(div);
  });

  it("hydrates head ignoring trailing extension-injected nodes", () => {
    const head = document.createElement("head");
    head.setAttribute("_hk", "0");
    const title = document.createElement("title");
    title.textContent = "Test";
    const meta = document.createElement("meta");
    meta.setAttribute("charset", "UTF-8");
    head.appendChild(title);
    head.appendChild(meta);

    const extScript = document.createElement("script");
    extScript.setAttribute("src", "chrome-extension://abc/inject.js");
    const extStyle = document.createElement("style");
    extStyle.textContent = ".ext-injected { display: none; }";
    head.appendChild(extScript);
    head.appendChild(extStyle);

    container.innerHTML = "";
    container.appendChild(head);

    r.hydrate(() => {
      const _el$ = r.getNextElement();
      const _el$2 = _el$.firstChild;
      const _el$3 = _el$2.nextSibling;
      r.insert(container, _el$, undefined, [...container.childNodes]);
      r.runHydrationEvents();
      return _el$;
    }, container);

    expect(container.firstChild).toBe(head);
    expect(head.firstChild).toBe(title);
    expect(title.nextSibling).toBe(meta);
    expect(meta.nextSibling).toBe(extScript);
    expect(extScript.nextSibling).toBe(extStyle);
    expect(head.childNodes.length).toBe(4);
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
