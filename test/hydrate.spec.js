import * as r from "./runtime";
import S from "s-js";

describe("r.hydration", () => {
  const container = document.createElement("div"),
    _tmpl$ = r.template(`<span><!--#--><!--/--> John</span>`),
    _tmpl$2 = r.template(`<div>First</div>`),
    _tmpl$3 = r.template(`<div>Last</div>`);
  let rendered;

  it("hydrates simple text", () => {
    S.root(() => {
      rendered = r.renderToString(() => {
        const leadingExpr = (function() {
          const _el$ = r.getNextElement(_tmpl$),
            _el$2 = _el$.firstChild,
            _el$3 = _el$2.nextSibling;
          r.insert(_el$, "Hi", _el$3);
          return _el$;
        })();
        return leadingExpr;
      });
    });
    expect(rendered).toBe(`<span _hk="0"><!--#-->Hi<!--/--> John</span>`);
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.firstChild,
      el3 = el2.nextSibling,
      el4 = el3.nextSibling;

    S.root(() => {
      r.hydration(() => {
        const leadingExpr = (function() {
          const _el$ = r.getNextElement(_tmpl$),
            _el$2 = _el$.firstChild,
            [_el$3, _co$] = r.getNextMarker(_el$2.nextSibling);
          r.hydration(() => r.insert(_el$, "Hi", _el$3, _co$), _el$);
          return _el$;
        })();
        r.insert(container, leadingExpr, undefined, [...container.childNodes]);
      }, container);
    });
    expect(container.innerHTML).toBe(
      `<span _hk="0"><!--#-->Hi<!--/--> John</span>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.firstChild).toBe(el2);
    expect(el2.nextSibling).toBe(el3);
    expect(el3.nextSibling).toBe(el4);
  });

  it("hydrates with an updated timestamp", () => {
    const time = Date.now();
    S.root(() => {
      rendered = r.renderToString(() => {
        const leadingExpr = (function() {
          const _el$ = r.getNextElement(_tmpl$),
            _el$2 = _el$.firstChild,
            _el$3 = _el$2.nextSibling;
          r.insert(_el$, time, _el$3);
          return _el$;
        })();
        return leadingExpr;
      });
    });
    expect(rendered).toBe(`<span _hk="0"><!--#-->${time}<!--/--> John</span>`);
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.firstChild,
      el3 = el2.nextSibling,
      el4 = el3.nextSibling;

    const updatedTime = Date.now();
    S.root(() => {
      r.hydration(() => {
        const leadingExpr = (function() {
          const _el$ = r.getNextElement(_tmpl$),
            _el$2 = _el$.firstChild,
            [_el$3, _co$] = r.getNextMarker(_el$2.nextSibling);
          r.hydration(() => r.insert(_el$, updatedTime, _el$3, _co$), _el$);
          return _el$;
        })();
        r.insert(container, leadingExpr, undefined, [...container.childNodes]);
      }, container);
    });
    expect(container.innerHTML).toBe(
      `<span _hk="0"><!--#-->${updatedTime}<!--/--> John</span>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.firstChild).toBe(el2);
    expect(el2.nextSibling).toBe(el3);
    expect(el3.nextSibling).toBe(el4);
  });

  it("hydrates fragments", () => {
    S.root(() => {
      rendered = r.renderToString(() => {
        const multiExpression = [
          r.getNextElement(_tmpl$2),
          "middle",
          r.getNextElement(_tmpl$3)
        ];
        return multiExpression;
      });
    });
    expect(rendered).toBe(
      `<div _hk="0">First</div>middle<div _hk="1">Last</div>`
    );
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.nextSibling,
      el3 = el2.nextSibling;

    S.root(() => {
      r.hydration(() => {
        const multiExpression = [
          r.getNextElement(_tmpl$2),
          "middle",
          r.getNextElement(_tmpl$3)
        ];
        r.insert(container, multiExpression, undefined, [
          ...container.childNodes
        ]);
      }, container);
    });
    expect(container.innerHTML).toBe(
      `<div _hk="0">First</div>middle<div _hk="1">Last</div>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.nextSibling).toEqual(el2);
    expect(el1.nextSibling.nextSibling).toBe(el3);
  });

  it("hydrates fragments with dynamic", () => {
    S.root(() => {
      rendered = r.renderToString(() => {
        const multiExpression = [
          r.getNextElement(_tmpl$2),
          () => "middle",
          r.getNextElement(_tmpl$3)
        ];
        return multiExpression;
      });
    });
    expect(rendered).toBe(
      `<div _hk="0">First</div>middle<div _hk="1">Last</div>`
    );
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.nextSibling,
      el3 = el2.nextSibling;

    S.root(() => {
      r.hydration(() => {
        const multiExpression = [
          r.getNextElement(_tmpl$2),
          () => "middle",
          r.getNextElement(_tmpl$3)
        ];
        r.insert(container, multiExpression, undefined, [
          ...container.childNodes
        ]);
      }, container);
    });
    expect(container.innerHTML).toBe(
      `<div _hk="0">First</div>middle<div _hk="1">Last</div>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.nextSibling).toEqual(el2);
    expect(el1.nextSibling.nextSibling).toBe(el3);
  });

  it("hydrates fragments with dynamic template", () => {
    S.root(() => {
      rendered = r.renderToString(() => {
        const multiExpression = [
          r.getNextElement(_tmpl$2),
          () => r.getNextElement(_tmpl$2),
          r.getNextElement(_tmpl$3)
        ];
        return multiExpression;
      });
    });
    expect(rendered).toBe(
      `<div _hk="0">First</div><div _hk="2">First</div><div _hk="1">Last</div>`
    );
    // gather refs
    container.innerHTML = rendered;
    const el1 = container.firstChild,
      el2 = el1.nextSibling,
      el3 = el2.nextSibling;

    S.root(() => {
      r.hydration(() => {
        const multiExpression = [
          r.getNextElement(_tmpl$2),
          () => r.getNextElement(_tmpl$2),
          r.getNextElement(_tmpl$3)
        ];
        r.insert(container, multiExpression, undefined, [
          ...container.childNodes
        ]);
      }, container);
    });
    expect(container.innerHTML).toBe(
      `<div _hk="0">First</div><div _hk="2">First</div><div _hk="1">Last</div>`
    );
    expect(container.firstChild).toBe(el1);
    expect(el1.nextSibling).toBe(el2);
    expect(el1.nextSibling.nextSibling).toBe(el3);
  });
});
