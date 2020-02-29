import * as r from "./runtime";
import { setHydrateContext, nextHydrateContext } from "./hydrate.config";
import S from "s-js";

describe("r.hydrate", () => {
  const container = document.createElement("div"),
    _tmpl$ = r.template(`<span><!--#--><!--/--> John</span>`),
    _tmpl$2 = r.template(`<div>First</div>`),
    _tmpl$3 = r.template(`<div>Last</div>`);
  let result, rendered;

  it("hydrates simple text", async () => {
    S.root(() => {
      result = r.renderToString(() => {
        const leadingExpr = (function() {
          const _el$ = r.getNextElement(_tmpl$, true),
            _el$2 = _el$.firstChild,
            _el$3 = _el$2.nextSibling;
          r.insert(_el$, "Hi", _el$3);
          return _el$;
        })();
        return leadingExpr;
      });
    });
    rendered = await result;
    expect(rendered).toBe(`<span _hk=":0"><!--#-->Hi<!--/--> John</span>`);
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.firstChild,
      el3 = el2.nextSibling,
      el4 = el3.nextSibling;

    S.root(() => {
      r.hydrate(() => {
        const leadingExpr = (function() {
          const _el$ = r.getNextElement(_tmpl$),
            _el$2 = _el$.firstChild,
            [_el$3, _co$] = r.getNextMarker(_el$2.nextSibling);
          r.insert(_el$, "Hi", _el$3, _co$);
          r.runHydrationEvents(_el$.getAttribute("_hk"));
          return _el$;
        })();
        r.insert(container, leadingExpr, undefined, [...container.childNodes]);
      }, container);
    });
    expect(container.innerHTML).toBe(
      `<span _hk=":0"><!--#-->Hi<!--/--> John</span>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.firstChild).toBe(el2);
    expect(el2.nextSibling).toBe(el3);
    expect(el3.nextSibling).toBe(el4);
  });

  it("hydrates with an updated timestamp", async () => {
    const time = Date.now();
    S.root(() => {
      result = r.renderToString(() => {
        const leadingExpr = (function() {
          const _el$ = r.getNextElement(_tmpl$, true),
            _el$2 = _el$.firstChild,
            _el$3 = _el$2.nextSibling;
          r.insert(_el$, time, _el$3);
          return _el$;
        })();
        return leadingExpr;
      });
    });
    rendered = await result;
    expect(rendered).toBe(`<span _hk=":0"><!--#-->${time}<!--/--> John</span>`);
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.firstChild,
      el3 = el2.nextSibling,
      el4 = el3.nextSibling;

    const updatedTime = Date.now();
    S.root(() => {
      r.hydrate(() => {
        const leadingExpr = (function() {
          const _el$ = r.getNextElement(_tmpl$),
            _el$2 = _el$.firstChild,
            [_el$3, _co$] = r.getNextMarker(_el$2.nextSibling);
          r.insert(_el$, updatedTime, _el$3, _co$);
          r.runHydrationEvents(_el$.getAttribute("_hk"));
          return _el$;
        })();
        r.insert(container, leadingExpr, undefined, [...container.childNodes]);
      }, container);
    });
    expect(container.innerHTML).toBe(
      `<span _hk=":0"><!--#-->${updatedTime}<!--/--> John</span>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.firstChild).toBe(el2);
    expect(el2.nextSibling).toBe(el3);
    expect(el3.nextSibling).toBe(el4);
  });

  it("hydrates fragments", async () => {
    S.root(() => {
      result = r.renderToString(() => {
        const multiExpression = [
          r.getNextElement(_tmpl$2, true),
          "middle",
          r.getNextElement(_tmpl$3, true)
        ];
        return multiExpression;
      });
    });
    rendered = await result;
    expect(rendered).toBe(
      `<div _hk=":0">First</div>middle<div _hk=":1">Last</div>`
    );
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.nextSibling,
      el3 = el2.nextSibling;

    S.root(() => {
      r.hydrate(() => {
        const multiExpression = [
          (function() {
            const _el$ = r.getNextElement(_tmpl$2);
            r.runHydrationEvents(_el$.getAttribute("_hk"));
            return _el$;
          })(),
          "middle",
          (function() {
            const _el$ = r.getNextElement(_tmpl$3);
            r.runHydrationEvents(_el$.getAttribute("_hk"));
            return _el$;
          })()
        ];
        r.insert(container, multiExpression, undefined, [
          ...container.childNodes
        ]);
      }, container);
    });
    expect(container.innerHTML).toBe(
      `<div _hk=":0">First</div>middle<div _hk=":1">Last</div>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.nextSibling).toEqual(el2);
    expect(el1.nextSibling.nextSibling).toBe(el3);
  });

  it("hydrates fragments with dynamic", async () => {
    S.root(() => {
      result = r.renderToString(() => {
        const multiExpression = [
          r.getNextElement(_tmpl$2, true),
          () => "middle",
          r.getNextElement(_tmpl$3, true)
        ];
        return multiExpression;
      });
    });
    rendered = await result;
    expect(rendered).toBe(
      `<div _hk=":0">First</div>middle<div _hk=":1">Last</div>`
    );
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.nextSibling,
      el3 = el2.nextSibling;

    S.root(() => {
      r.hydrate(() => {
        const multiExpression = [
          (function() {
            const _el$ = r.getNextElement(_tmpl$2);
            r.runHydrationEvents(_el$.getAttribute("_hk"));
            return _el$;
          })(),
          () => "middle",
          (function() {
            const _el$ = r.getNextElement(_tmpl$3);
            r.runHydrationEvents(_el$.getAttribute("_hk"));
            return _el$;
          })()
        ];
        r.insert(container, multiExpression, undefined, [
          ...container.childNodes
        ]);
      }, container);
    });
    expect(container.innerHTML).toBe(
      `<div _hk=":0">First</div>middle<div _hk=":1">Last</div>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.nextSibling).toEqual(el2);
    expect(el1.nextSibling.nextSibling).toBe(el3);
  });

  it("hydrates fragments with dynamic template", async () => {
    S.root(() => {
      result = r.renderToString(() => {
        const multiExpression = [
          r.getNextElement(_tmpl$2, true),
          () => r.getNextElement(_tmpl$2, true),
          r.getNextElement(_tmpl$3, true)
        ];
        return multiExpression;
      });
    });
    rendered = await result;
    expect(rendered).toBe(
      `<div _hk=":0">First</div><div _hk=":2">First</div><div _hk=":1">Last</div>`
    );
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.nextSibling,
      el3 = el2.nextSibling;

    S.root(() => {
      r.hydrate(() => {
        const multiExpression = [
          (function() {
            const _el$ = r.getNextElement(_tmpl$2);
            r.runHydrationEvents(_el$.getAttribute("_hk"));
            return _el$;
          })(),
          () =>
            (function() {
              const _el$ = r.getNextElement(_tmpl$2);
              r.runHydrationEvents(_el$.getAttribute("_hk"));
              return _el$;
            })(),
          (function() {
            const _el$ = r.getNextElement(_tmpl$3);
            r.runHydrationEvents(_el$.getAttribute("_hk"));
            return _el$;
          })()
        ];
        r.insert(container, multiExpression, undefined, [
          ...container.childNodes
        ]);
      }, container);
    });
    expect(container.innerHTML).toBe(
      `<div _hk=":0">First</div><div _hk=":2">First</div><div _hk=":1">Last</div>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.nextSibling).toBe(el2);
    expect(el1.nextSibling.nextSibling).toBe(el3);
  });

  it("renders asynchronously", async () => {
    S.root(() => {
      const signal = S.data();
      result = r.renderToString(done => {
        const multiExpression = [
          r.getNextElement(_tmpl$2, true),
          signal,
          r.getNextElement(_tmpl$3, true)
        ];
        setTimeout(() => {
          signal(r.getNextElement(_tmpl$3, true));
          done(multiExpression);
        }, 20);
      });
    });
    rendered = await result;
    expect(rendered).toBe(
      `<div _hk=":0">First</div><div _hk=":2">Last</div><div _hk=":1">Last</div>`
    );
  });

  it("timeouts asynchronous render", async () => {
    S.root(() => {
      const signal = S.data();
      result = r.renderToString(
        done => {
          const multiExpression = [
            r.getNextElement(_tmpl$2, true),
            signal,
            r.getNextElement(_tmpl$3, true)
          ];
          setTimeout(() => {
            signal(r.getNextElement(_tmpl$3, true));
            done(multiExpression);
          }, 20);
        },
        { timeoutMs: 0 }
      );
    });
    let errored;
    try {
      rendered = await result;
    } catch {
      errored = true;
    }
    expect(errored).toBe(true);
  });

  it("renders nested asynchronous context", async () => {
    S.root(() => {
      let multiExpression;
      function lazy(done) {
        const signal = S.data(),
          ctx = nextHydrateContext();
        setTimeout(() => {
          setHydrateContext(ctx);
          signal(r.getNextElement(_tmpl$3, true));
          done(multiExpression);
        }, 20);
        return signal;
      }
      result = r.renderToString(done => {
        multiExpression = [
          r.getNextElement(_tmpl$2, true),
          lazy(done),
          r.getNextElement(_tmpl$3, true)
        ];
      });
    });
    rendered = await result;
    expect(rendered).toBe(
      `<div _hk=":0">First</div><div _hk=".1:0">Last</div><div _hk=":2">Last</div>`
    );
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.nextSibling,
      el3 = el2.nextSibling;

    S.root(() => {
      function lazy() {
        const signal = S.data(),
          ctx = nextHydrateContext();
        setTimeout(() => {
          setHydrateContext(ctx);
          signal(
            (function() {
              const _el$ = r.getNextElement(_tmpl$3);
              r.runHydrationEvents(_el$.getAttribute("_hk"));
              return _el$;
            })()
          );
        }, 20);
        return signal;
      }
      r.hydrate(() => {
        const multiExpression = [
          (function() {
            const _el$ = r.getNextElement(_tmpl$2);
            r.runHydrationEvents(_el$.getAttribute("_hk"));
            return _el$;
          })(),
          lazy(),
          (function() {
            const _el$ = r.getNextElement(_tmpl$3);
            r.runHydrationEvents(_el$.getAttribute("_hk"));
            return _el$;
          })()
        ];
        r.insert(container, multiExpression, undefined, [
          ...container.childNodes
        ]);
      }, container);
    });
    await new Promise(r => setTimeout(r, 50));
    expect(container.innerHTML).toBe(
      `<div _hk=":0">First</div><div _hk=".1:0">Last</div><div _hk=":2">Last</div>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.nextSibling).toBe(el2);
    expect(el1.nextSibling.nextSibling).toBe(el3);
  });
});
