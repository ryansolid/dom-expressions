import { template as _$template } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { insert as _$insert } from "r-dom";
const _tmpl$ = /*#__PURE__*/ _$template(`<span>Hello `),
  _tmpl$2 = /*#__PURE__*/ _$template(`<span> John`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<span>Hello John`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<span> `),
  _tmpl$5 = /*#__PURE__*/ _$template(`<span> <!> <!> `),
  _tmpl$6 = /*#__PURE__*/ _$template(`<span> <!> `),
  _tmpl$7 = /*#__PURE__*/ _$template(`<span>Hello`),
  _tmpl$8 = /*#__PURE__*/ _$template(`<span>&nbsp;&lt;Hi&gt;&nbsp;`),
  _tmpl$9 = /*#__PURE__*/ _$template(`<span>Hi&lt;script>alert();&lt;/script>`),
  _tmpl$10 = /*#__PURE__*/ _$template(`<span>Hello World!`),
  _tmpl$11 = /*#__PURE__*/ _$template(`<span>4 + 5 = 9`),
  _tmpl$12 = /*#__PURE__*/ _$template(`<div>
d`),
  _tmpl$13 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$14 = /*#__PURE__*/ _$template(`<div normal="Search…" title="Search&amp;hellip;">`),
  _tmpl$15 = /*#__PURE__*/ _$template(`<div><div>`);
const trailing = _tmpl$();
const leading = _tmpl$2();

/* prettier-ignore */
const extraSpaces = _tmpl$3();
const trailingExpr = (() => {
  const _el$4 = _tmpl$(),
    _el$5 = _el$4.firstChild;
  _$insert(_el$4, name, null);
  return _el$4;
})();
const leadingExpr = (() => {
  const _el$6 = _tmpl$2(),
    _el$7 = _el$6.firstChild;
  _$insert(_el$6, greeting, _el$7);
  return _el$6;
})();

/* prettier-ignore */
const multiExpr = (() => {
  const _el$8 = _tmpl$4(),
    _el$9 = _el$8.firstChild;
  _$insert(_el$8, greeting, _el$9);
  _$insert(_el$8, name, null);
  return _el$8;
})();

/* prettier-ignore */
const multiExprSpaced = (() => {
  const _el$10 = _tmpl$5(),
    _el$11 = _el$10.firstChild,
    _el$14 = _el$11.nextSibling,
    _el$12 = _el$14.nextSibling,
    _el$15 = _el$12.nextSibling,
    _el$13 = _el$15.nextSibling;
  _$insert(_el$10, greeting, _el$14);
  _$insert(_el$10, name, _el$15);
  return _el$10;
})();

/* prettier-ignore */
const multiExprTogether = (() => {
  const _el$16 = _tmpl$6(),
    _el$17 = _el$16.firstChild,
    _el$19 = _el$17.nextSibling,
    _el$18 = _el$19.nextSibling;
  _$insert(_el$16, greeting, _el$19);
  _$insert(_el$16, name, _el$19);
  return _el$16;
})();

/* prettier-ignore */
const multiLine = _tmpl$7();

/* prettier-ignore */
const multiLineTrailingSpace = _tmpl$3();

/* prettier-ignore */
const multiLineNoTrailingSpace = _tmpl$3();

/* prettier-ignore */
const escape = _tmpl$8();

/* prettier-ignore */
const escape2 = _$createComponent(Comp, {
  children: "\xA0<Hi>\xA0"
});

/* prettier-ignore */
const escape3 = "\xA0<Hi>\xA0";
const injection = _tmpl$9();
let value = "World";
const evaluated = _tmpl$10();
let number = 4 + 5;
const evaluatedNonString = _tmpl$11();
const newLineLiteral = (() => {
  const _el$27 = _tmpl$12(),
    _el$28 = _el$27.firstChild;
  _$insert(_el$27, s, _el$28);
  return _el$27;
})();
const trailingSpace = (() => {
  const _el$29 = _tmpl$13();
  _$insert(_el$29, expr);
  return _el$29;
})();
const trailingSpaceComp = _$createComponent(Comp, {
  children: expr
});
const trailingSpaceFrag = expr;
const leadingSpaceElement = (() => {
  const _el$30 = _tmpl$4(),
    _el$31 = _el$30.firstChild;
  _$insert(_el$30, expr, null);
  return _el$30;
})();
const leadingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [" ", expr];
  }
});
const leadingSpaceFragment = [" ", expr];
const trailingSpaceElement = (() => {
  const _el$32 = _tmpl$4(),
    _el$33 = _el$32.firstChild;
  _$insert(_el$32, expr, _el$33);
  return _el$32;
})();
const trailingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [expr, " "];
  }
});
const trailingSpaceFragment = [expr, " "];
const escapeAttribute = _tmpl$14();
const escapeCompAttribute = _$createComponent(Div, {
  normal: "Search\u2026",
  title: "Search&hellip;"
});
const lastElementExpression = (() => {
  const _el$35 = _tmpl$15(),
    _el$36 = _el$35.firstChild;
  _$insert(_el$35, expr, null);
  return _el$35;
})();
