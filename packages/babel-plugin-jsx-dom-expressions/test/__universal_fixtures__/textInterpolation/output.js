import { setProp as _$setProp } from "r-custom";
import { createComponent as _$createComponent } from "r-custom";
import { insert as _$insert } from "r-custom";
import { createTextNode as _$createTextNode } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { createElement as _$createElement } from "r-custom";
const trailing = (() => {
  const _el$ = _$createElement("span");
  _$insertNode(_el$, _$createTextNode(`Hello `));
  return _el$;
})();
const leading = (() => {
  const _el$3 = _$createElement("span");
  _$insertNode(_el$3, _$createTextNode(` John`));
  return _el$3;
})();

/* prettier-ignore */
const extraSpaces = (() => {
  const _el$5 = _$createElement("span");
  _$insertNode(_el$5, _$createTextNode(`Hello John`));
  return _el$5;
})();
const trailingExpr = (() => {
  const _el$7 = _$createElement("span"),
    _el$8 = _$createTextNode(`Hello `);
  _$insertNode(_el$7, _el$8);
  _$insert(_el$7, name, null);
  return _el$7;
})();
const leadingExpr = (() => {
  const _el$9 = _$createElement("span"),
    _el$10 = _$createTextNode(` John`);
  _$insertNode(_el$9, _el$10);
  _$insert(_el$9, greeting, _el$10);
  return _el$9;
})();

/* prettier-ignore */
const multiExpr = (() => {
  const _el$11 = _$createElement("span"),
    _el$12 = _$createTextNode(` `);
  _$insertNode(_el$11, _el$12);
  _$insert(_el$11, greeting, _el$12);
  _$insert(_el$11, name, null);
  return _el$11;
})();

/* prettier-ignore */
const multiExprSpaced = (() => {
  const _el$13 = _$createElement("span"),
    _el$14 = _$createTextNode(` `),
    _el$15 = _$createTextNode(` `),
    _el$16 = _$createTextNode(` `);
  _$insertNode(_el$13, _el$14);
  _$insertNode(_el$13, _el$15);
  _$insertNode(_el$13, _el$16);
  _$insert(_el$13, greeting, _el$15);
  _$insert(_el$13, name, _el$16);
  return _el$13;
})();

/* prettier-ignore */
const multiExprTogether = (() => {
  const _el$17 = _$createElement("span"),
    _el$18 = _$createTextNode(` `),
    _el$19 = _$createTextNode(` `);
  _$insertNode(_el$17, _el$18);
  _$insertNode(_el$17, _el$19);
  _$insert(_el$17, greeting, _el$19);
  _$insert(_el$17, name, _el$19);
  return _el$17;
})();

/* prettier-ignore */
const multiLine = (() => {
  const _el$20 = _$createElement("span");
  _$insertNode(_el$20, _$createTextNode(`Hello`));
  return _el$20;
})();

/* prettier-ignore */
const multiLineTrailingSpace = (() => {
  const _el$22 = _$createElement("span");
  _$insertNode(_el$22, _$createTextNode(`Hello John`));
  return _el$22;
})();

/* prettier-ignore */
const multiLineNoTrailingSpace = (() => {
  const _el$24 = _$createElement("span");
  _$insertNode(_el$24, _$createTextNode(`Hello John`));
  return _el$24;
})();

/* prettier-ignore */
const escape = (() => {
  const _el$26 = _$createElement("span");
  _$insertNode(_el$26, _$createTextNode(`&nbsp;&lt;Hi&gt;&nbsp;`));
  return _el$26;
})();

/* prettier-ignore */
const escape2 = _$createComponent(Comp, {
  children: "\xA0<Hi>\xA0"
});

/* prettier-ignore */
const escape3 = "\xA0<Hi>\xA0";
const injection = (() => {
  const _el$28 = _$createElement("span"),
    _el$29 = _$createTextNode(`Hi&lt;script>alert();&lt;/script>`);
  _$insertNode(_el$28, _el$29);
  return _el$28;
})();
let value = "World";
const evaluated = (() => {
  const _el$31 = _$createElement("span"),
    _el$32 = _$createTextNode(`Hello World!`);
  _$insertNode(_el$31, _el$32);
  return _el$31;
})();
let number = 4 + 5;
const evaluatedNonString = (() => {
  const _el$34 = _$createElement("span"),
    _el$35 = _$createTextNode(`4 + 5 = 9`);
  _$insertNode(_el$34, _el$35);
  return _el$34;
})();
const newLineLiteral = (() => {
  const _el$37 = _$createElement("div"),
    _el$38 = _$createTextNode(`
d`);
  _$insertNode(_el$37, _el$38);
  _$insert(_el$37, s, _el$38);
  return _el$37;
})();
const trailingSpace = (() => {
  const _el$40 = _$createElement("div");
  _$insert(_el$40, expr);
  return _el$40;
})();
const trailingSpaceComp = _$createComponent(Comp, {
  children: expr
});
const trailingSpaceFrag = expr;
const leadingSpaceElement = (() => {
  const _el$41 = _$createElement("span"),
    _el$42 = _$createTextNode(` `);
  _$insertNode(_el$41, _el$42);
  _$insert(_el$41, expr, null);
  return _el$41;
})();
const leadingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [" ", expr];
  }
});
const leadingSpaceFragment = [" ", expr];
const trailingSpaceElement = (() => {
  const _el$43 = _$createElement("span"),
    _el$44 = _$createTextNode(` `);
  _$insertNode(_el$43, _el$44);
  _$insert(_el$43, expr, _el$44);
  return _el$43;
})();
const trailingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [expr, " "];
  }
});
const trailingSpaceFragment = [expr, " "];
const escapeAttribute = (() => {
  const _el$45 = _$createElement("div");
  _$setProp(_el$45, "normal", "Search&hellip;");
  _$setProp(_el$45, "title", "Search&hellip;");
  return _el$45;
})();
const escapeCompAttribute = _$createComponent(Div, {
  normal: "Search\u2026",
  title: "Search&hellip;"
});
