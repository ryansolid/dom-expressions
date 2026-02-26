import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { escape as _$escape } from "r-server";
import { ssr as _$ssr } from "r-server";
var _tmpl$ = "<span>Hello </span>",
  _tmpl$2 = "<span> John</span>",
  _tmpl$3 = "<span>Hello John</span>",
  _tmpl$4 = ["<span>Hello ", "</span>"],
  _tmpl$5 = ["<span>", " John</span>"],
  _tmpl$6 = ["<span>", " ", "</span>"],
  _tmpl$7 = ["<span> ", " ", " </span>"],
  _tmpl$8 = ["<span> ", "", " </span>"],
  _tmpl$9 = "<span>Hello</span>",
  _tmpl$10 = "<span>&nbsp;&lt;Hi&gt;&nbsp;</span>",
  _tmpl$11 = "<span>Hi&lt;script>alert();&lt;/script></span>",
  _tmpl$12 = "<span>Hello World!</span>",
  _tmpl$13 = "<span>4 + 5 = 9</span>",
  _tmpl$14 = ["<div>", "\nd</div>"],
  _tmpl$15 = ["<div>", "</div>"],
  _tmpl$16 = ["<span> ", "</span>"],
  _tmpl$17 = ["<span>", " </span>"],
  _tmpl$18 = '<div normal="Search\u2026" title="Search&amp;hellip;"></div>',
  _tmpl$19 = ["<div><div></div>", "</div>"],
  _tmpl$20 = "<p>${blah}</p>";
const trailing = _$ssr(_tmpl$);
const leading = _$ssr(_tmpl$2);

/* prettier-ignore */
const extraSpaces = _$ssr(_tmpl$3);
const trailingExpr = (() => {
  var _v$ = _$escape(name);
  return _$ssr(_tmpl$4, _v$);
})();
const leadingExpr = (() => {
  var _v$2 = _$escape(greeting);
  return _$ssr(_tmpl$5, _v$2);
})();

/* prettier-ignore */
const multiExpr = (() => {
  var _v$3 = _$escape(greeting),
    _v$4 = _$escape(name);
  return _$ssr(_tmpl$6, _v$3, _v$4);
})();

/* prettier-ignore */
const multiExprSpaced = (() => {
  var _v$5 = _$escape(greeting),
    _v$6 = _$escape(name);
  return _$ssr(_tmpl$7, _v$5, _v$6);
})();

/* prettier-ignore */
const multiExprTogether = (() => {
  var _v$7 = _$escape(greeting),
    _v$8 = _$escape(name);
  return _$ssr(_tmpl$8, _v$7, _v$8);
})();

/* prettier-ignore */
const multiLine = _$ssr(_tmpl$9);

/* prettier-ignore */
const multiLineTrailingSpace = _$ssr(_tmpl$3);

/* prettier-ignore */
const multiLineNoTrailingSpace = _$ssr(_tmpl$3);

/* prettier-ignore */
const escape = _$ssr(_tmpl$10);

/* prettier-ignore */
const escape2 = _$createComponent(Comp, {
  children: "\xA0<Hi>\xA0"
});

/* prettier-ignore */
const escape3 = "\xA0<Hi>\xA0";
const injection = _$ssr(_tmpl$11);
let value = "World";
const evaluated = _$ssr(_tmpl$12);
let number = 4 + 5;
const evaluatedNonString = _$ssr(_tmpl$13);
const newLineLiteral = (() => {
  var _v$9 = _$escape(s);
  return _$ssr(_tmpl$14, _v$9);
})();
const trailingSpace = (() => {
  var _v$10 = _$escape(expr);
  return _$ssr(_tmpl$15, _v$10);
})();
const trailingSpaceComp = _$createComponent(Comp, {
  children: expr
});
const trailingSpaceFrag = expr;
const leadingSpaceElement = (() => {
  var _v$11 = _$escape(expr);
  return _$ssr(_tmpl$16, _v$11);
})();
const leadingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [" ", expr];
  }
});
const leadingSpaceFragment = [" ", expr];
const trailingSpaceElement = (() => {
  var _v$12 = _$escape(expr);
  return _$ssr(_tmpl$17, _v$12);
})();
const trailingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [expr, " "];
  }
});
const trailingSpaceFragment = [expr, " "];
const escapeAttribute = _$ssr(_tmpl$18);
const escapeCompAttribute = _$createComponent(Div, {
  normal: "Search\u2026",
  title: "Search&hellip;"
});
const lastElementExpression = (() => {
  var _v$13 = _$ssrRunInScope(() => _$escape(expr()));
  return _$ssr(_tmpl$19, _v$13);
})();
const messwithTemplates = _$ssr(_tmpl$20);
