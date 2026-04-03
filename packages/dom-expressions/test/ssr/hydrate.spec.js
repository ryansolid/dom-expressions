/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import * as r2 from "../../src/server";
import { createSignal, flush } from "@solidjs/signals";
import { sharedConfig } from "../core";

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

  it("updates an initially empty hydrating marker range before its following sibling", () => {
    const _tmpl$4 = r.template(`<div>TEXT</div>`),
      _tmpl$5 = r.template(`<div><!$><!/><button>Toggle: <!$><!/></button></div>`);

    rendered = r2.renderToString(() =>
      r2.ssr(
        ["<div", "><!--$-->", "<!--/--><button>Toggle: <!--$-->", "<!--/--></button></div>"],
        r2.ssrHydrationKey(),
        undefined,
        r2.escape(0)
      )
    );

    container.innerHTML = rendered;
    let setter;

    r.hydrate(() => {
      const [toggle, setToggle] = createSignal(0);
      setter = setToggle;
      const _el$ = r.getNextElement(_tmpl$5),
        _el$2 = _el$.firstChild,
        [_el$3, _co$2] = r.getNextMarker(_el$2.nextSibling),
        _el$4 = _el$3.nextSibling,
        _el$5 = _el$4.firstChild,
        _el$6 = _el$5.nextSibling,
        [_el$7, _co$] = r.getNextMarker(_el$6.nextSibling);

      r.insert(_el$, r.memo(() => (toggle() ? r.getNextElement(_tmpl$4) : undefined)), _el$3, _co$2);
      r.insert(_el$4, toggle, _el$7, _co$);
      r.insert(container, _el$, undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);

    expect(container.innerHTML).toBe(
      '<div _hk="0"><!--$--><!--/--><button>Toggle: <!--$-->0<!--/--></button></div>'
    );

    setter(1);
    flush();
    expect(container.innerHTML).toBe(
      '<div _hk="0"><!--$--><div>TEXT</div><!--/--><button>Toggle: <!--$-->1<!--/--></button></div>'
    );
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

});

describe("Phase 1: Hydration error diagnostics", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);

  beforeEach(() => {
    globalThis._$HY = { events: [], completed: new WeakSet() };
    container.innerHTML = "";
  });

  it("template guard fires on direct template call during hydration", () => {
    container.innerHTML = '<div _hk="0">Server</div>';
    const freshTmpl = r.template("<div>Created</div>");
    expect(() => {
      r.hydrate(() => {
        freshTmpl();
      }, container);
    }).toThrow("Failed attempt to create new DOM elements during hydration");
  });

  it("getNextElement falls through to template(true) when key not found", () => {
    const _tmpl$ = r.template("<div>Fallback</div>");
    container.innerHTML = '<div _hk="0">Server</div>';

    r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      expect(_el$.textContent).toBe("Server");

      const _el$2 = r.getNextElement(_tmpl$);
      expect(_el$2.textContent).toBe("Fallback");

      r.insert(container, [_el$, _el$2], undefined, [...container.childNodes]);
    }, container);
  });

  it("getNextElement throws when key not found and no template", () => {
    container.innerHTML = '<div _hk="0">Server</div>';
    expect(() => {
      r.hydrate(() => {
        r.getNextElement();
        r.getNextElement();
      }, container);
    }).toThrow("Hydration Mismatch. Unable to find DOM nodes for hydration key");
  });

  it("getNextElement warns on tag mismatch between claimed node and template", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const _tmpl$ = r.template("<span>Expected span</span>");
    container.innerHTML = '<div _hk="0">Actually a div</div>';
    const claimedNode = container.firstChild;

    r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      expect(_el$.localName).toBe("div");
      r.insert(container, _el$, undefined, [...container.childNodes]);
    }, container);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("expected <span> but found"),
      claimedNode
    );
    warn.mockRestore();
  });

  it("getNextElement does not warn when tags match", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const _tmpl$ = r.template("<div>Correct</div>");
    container.innerHTML = '<div _hk="0">Correct</div>';

    r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      expect(_el$.localName).toBe("div");
      r.insert(container, _el$, undefined, [...container.childNodes]);
    }, container);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("verifyHydration warns about unclaimed registry entries", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const _tmpl$ = r.template("<div>Content</div>");
    container.innerHTML = '<div _hk="0">First</div><span _hk="1">Orphan</span>';

    r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      r.insert(container, _el$, undefined, [...container.childNodes]);
    }, container);

    sharedConfig.verifyHydration();
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0][0];
    expect(message).toBe(
      `Hydration completed with 1 unclaimed server-rendered node(s):\n` +
      `  <span _hk="1">Orphan</span>`
    );
    warn.mockRestore();
  });

  it("verifyHydration produces no warning when all nodes are claimed", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const _tmpl$ = r.template("<div>Content</div>");
    container.innerHTML = '<div _hk="0">Only</div>';

    r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      r.insert(container, _el$, undefined, [...container.childNodes]);
    }, container);

    sharedConfig.verifyHydration();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("verifyHydration ignores disconnected registry entries", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const stale = document.createElement("div");
    stale.setAttribute("_hk", "1");
    stale.textContent = "Stale";
    sharedConfig.registry = new Map([["1", stale]]);

    sharedConfig.verifyHydration();
    expect(sharedConfig.registry.size).toBe(0);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("Phase 2: Walk validation helpers", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let dispose;

  beforeEach(() => {
    if (dispose) dispose();
    globalThis._$HY = { events: [], completed: new WeakSet() };
    container.innerHTML = "";
  });

  afterEach(() => {
    if (dispose) { dispose(); dispose = null; }
  });

  it("getFirstChild warns on tag mismatch with parent-wrapped visualization", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const _tmpl$ = r.template("<table><tr><td>Cell</td></tr></table>");
    container.innerHTML = '<table _hk="0"><tbody><tr><td>Cell</td></tr></tbody></table>';
    const table = container.firstChild;

    dispose = r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      const _el$2 = r.getFirstChild(_el$, "tr");
      r.insert(container, _el$, undefined, [...container.childNodes]);
    }, container);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("expected <tr> as first child of");
    expect(warn.mock.calls[0][1]).toBe(table);
    const viz = warn.mock.calls[0][2];
    expect(viz).toContain("<table>");
    expect(viz).toContain("\u2190 expected tr");
    expect(viz).toContain("</table>");
    warn.mockRestore();
  });

  it("getNextSibling warns on tag mismatch with parent-wrapped visualization", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const _tmpl$ = r.template("<div><span></span><p></p></div>");
    container.innerHTML = '<div _hk="0"><span></span><div></div></div>';
    const span = container.firstChild.firstChild;
    const parent = container.firstChild;

    dispose = r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      const _el$2 = r.getFirstChild(_el$, "span");
      const _el$3 = r.getNextSibling(_el$2, "p");
      r.insert(container, _el$, undefined, [...container.childNodes]);
    }, container);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("expected <p> after");
    expect(warn.mock.calls[0][1]).toBe(span);
    expect(warn.mock.calls[0][3]).toBe(parent);
    const viz = warn.mock.calls[0][4];
    expect(viz).toContain("<div>");
    expect(viz).toContain("\u2190 expected p");
    expect(viz).toContain("</div>");
    warn.mockRestore();
  });

  it("getFirstChild shows missing format when child is absent", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const _tmpl$ = r.template("<ul><li></li></ul>");
    container.innerHTML = '<ul _hk="0"></ul>';

    dispose = r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      const _el$2 = r.getFirstChild(_el$, "li");
      r.insert(container, _el$, undefined, [...container.childNodes]);
    }, container);

    expect(warn).toHaveBeenCalledTimes(1);
    const viz = warn.mock.calls[0][2];
    expect(viz).toContain("<ul><li \u2190 missing></ul>");
    warn.mockRestore();
  });

  it("getFirstChild does not warn when tag matches", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const _tmpl$ = r.template("<div><span></span></div>");
    container.innerHTML = '<div _hk="0"><span></span></div>';

    dispose = r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      const _el$2 = r.getFirstChild(_el$, "span");
      r.insert(container, _el$, undefined, [...container.childNodes]);
    }, container);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("getNextSibling does not warn when tag matches", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const _tmpl$ = r.template("<div><span></span><p></p></div>");
    container.innerHTML = '<div _hk="0"><span></span><p></p></div>';

    dispose = r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      const _el$2 = r.getFirstChild(_el$, "span");
      const _el$3 = r.getNextSibling(_el$2, "p");
      r.insert(container, _el$, undefined, [...container.childNodes]);
    }, container);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("describeSiblings windows output for parents with many children", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const _tmpl$ = r.template(
      "<ul><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul>"
    );
    container.innerHTML =
      '<ul _hk="0"><li></li><li></li><li></li><li></li><div></div><li></li><li></li><li></li></ul>';

    dispose = r.hydrate(() => {
      const _el$ = r.getNextElement(_tmpl$);
      const _el$2 = r.getFirstChild(_el$, "li");
      const _el$3 = r.getNextSibling(_el$2, "li");
      const _el$4 = r.getNextSibling(_el$3, "li");
      const _el$5 = r.getNextSibling(_el$4, "li");
      const _el$6 = r.getNextSibling(_el$5, "li");
      r.insert(container, _el$, undefined, [...container.childNodes]);
    }, container);

    expect(warn).toHaveBeenCalledTimes(1);
    const viz = warn.mock.calls[0][4];
    expect(viz).toContain("...");
    expect(viz).toContain("\u2190 expected li");
    expect(viz).toContain("<ul>");
    expect(viz).toContain("</ul>");
    warn.mockRestore();
  });
});

describe("Spread element hydration", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);

  beforeEach(() => {
    globalThis._$HY = { events: [], completed: new WeakSet() };
    container.innerHTML = "";
  });

  it("sibling spread elements produce sequential _hk values", () => {
    const linkProps = { class: "link" };
    const rendered = r2.renderToString(() => [
      r2.ssrElement("a", linkProps, () => "First", true),
      r2.ssrElement("a", linkProps, () => "Second", true)
    ]);

    const hkValues = [...rendered.matchAll(/_hk=(\S+?)[\s>]/g)].map(m => m[1]);
    expect(hkValues).toEqual(["0", "1"]);
  });

  it("sibling spread elements with dynamic children produce sequential _hk values", () => {
    const getProps = () => ({ class: "link" });
    const rendered = r2.renderToString(() => [
      r2.ssrElement("a", getProps(), () => "First", true),
      r2.ssrElement("a", getProps(), () => r2.escape("dynamic1"), true),
      r2.ssrElement("a", getProps(), () => "Third", true)
    ]);

    const hkValues = [...rendered.matchAll(/_hk=(\S+?)[\s>]/g)].map(m => m[1]);
    expect(hkValues).toEqual(["0", "1", "2"]);
  });

  it("hydrates sibling spread elements preserving DOM nodes", () => {
    const linkProps = { class: "link" };
    const rendered = r2.renderToString(() => [
      r2.ssrElement("a", linkProps, () => "First", true),
      r2.ssrElement("a", linkProps, () => "Second", true)
    ]);

    container.innerHTML = rendered;
    const el1 = container.firstChild;
    const el2 = el1.nextSibling;
    expect(el1.tagName).toBe("A");
    expect(el2.tagName).toBe("A");

    const _tmpl$ = r.template("<a></a>");
    r.hydrate(() => {
      const _el$1 = r.getNextElement(_tmpl$);
      r.spread(_el$1, linkProps, false, true);
      r.insert(_el$1, "First");
      r.runHydrationEvents(_el$1.getAttribute("_hk"));

      const _el$2 = r.getNextElement(_tmpl$);
      r.spread(_el$2, linkProps, false, true);
      r.insert(_el$2, "Second");
      r.runHydrationEvents(_el$2.getAttribute("_hk"));

      r.insert(container, [_el$1, _el$2], undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);

    expect(container.firstChild).toBe(el1);
    expect(el1.nextSibling).toBe(el2);
    expect(el1.textContent).toBe("First");
    expect(el2.textContent).toBe("Second");
  });
});

describe("SSR scope hydration alignment", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);

  beforeEach(() => {
    globalThis._$HY = { events: [], completed: new WeakSet() };
    container.innerHTML = "";
  });

  it("keeps sibling hydration keys aligned for ssrRunInScope-wrapped attributes", () => {
    const rendered = r2.renderToString(() => [
      r2.ssr(
        ["<input", "", ">"],
        r2.ssrHydrationKey(),
        r2.ssrRunInScope(() => r2.ssrAttribute("value", "first"))()
      ),
      r2.ssr(["<div", ">Second</div>"], r2.ssrHydrationKey())
    ]);

    const hkValues = [...rendered.matchAll(/_hk=(\S+?)[\s>]/g)].map(m => m[1]);
    expect(hkValues).toEqual(["0", "1"]);

    container.innerHTML = rendered;

    const inputNode = container.firstChild;
    const divNode = inputNode.nextSibling;
    const inputTemplate = r.template("<input>");
    const divTemplate = r.template("<div>Second</div>");

    r.hydrate(() => {
      const _el$1 = r.getNextElement(inputTemplate);
      r.runHydrationEvents(_el$1.getAttribute("_hk"));

      const _el$2 = r.getNextElement(divTemplate);
      r.runHydrationEvents(_el$2.getAttribute("_hk"));

      r.insert(container, [_el$1, _el$2], undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);

    expect(container.firstChild).toBe(inputNode);
    expect(inputNode.nextSibling).toBe(divNode);
  });

  it("keeps sibling hydration keys aligned for ssrRunInScope-wrapped textarea children", () => {
    const rendered = r2.renderToString(() => [
      r2.ssr(
        ["<textarea", ">", "</textarea>"],
        r2.ssrHydrationKey(),
        r2.ssrRunInScope(() => r2.escape("first"))()
      ),
      r2.ssr(["<div", ">Second</div>"], r2.ssrHydrationKey())
    ]);

    const hkValues = [...rendered.matchAll(/_hk=(\S+?)[\s>]/g)].map(m => m[1]);
    expect(hkValues).toEqual(["0", "1"]);

    container.innerHTML = rendered;

    const textareaNode = container.firstChild;
    const divNode = textareaNode.nextSibling;
    const textareaTemplate = r.template("<textarea></textarea>");
    const divTemplate = r.template("<div>Second</div>");

    r.hydrate(() => {
      const _el$1 = r.getNextElement(textareaTemplate);
      r.runHydrationEvents(_el$1.getAttribute("_hk"));

      const _el$2 = r.getNextElement(divTemplate);
      r.runHydrationEvents(_el$2.getAttribute("_hk"));

      r.insert(container, [_el$1, _el$2], undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);

    expect(container.firstChild).toBe(textareaNode);
    expect(textareaNode.nextSibling).toBe(divNode);
  });
});
