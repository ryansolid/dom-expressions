import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { escape as _$escape } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = ["<span", ">Hello </span>"],
  _tmpl$2 = ["<span", "> John</span>"],
  _tmpl$3 = ["<span", ">Hello John</span>"],
  _tmpl$4 = ["<span", ">Hello <!--$-->", "<!--/--></span>"],
  _tmpl$5 = ["<span", "><!--$-->", "<!--/--> John</span>"],
  _tmpl$6 = ["<span", "><!--$-->", "<!--/--> <!--$-->", "<!--/--></span>"],
  _tmpl$7 = ["<span", "> <!--$-->", "<!--/--> <!--$-->", "<!--/--> </span>"],
  _tmpl$8 = ["<span", "> <!--$-->", "<!--/--><!--$-->", "<!--/--> </span>"],
  _tmpl$9 = ["<span", ">Hello</span>"],
  _tmpl$10 = ["<span", ">&nbsp;&lt;Hi&gt;&nbsp;</span>"],
  _tmpl$11 = ["<span", ">Hi&lt;script>alert();&lt;/script></span>"],
  _tmpl$12 = ["<span", ">Hello World!</span>"],
  _tmpl$13 = ["<span", ">4 + 5 = 9</span>"],
  _tmpl$14 = ["<div", "><!--$-->", "<!--/-->\nd</div>"],
  _tmpl$15 = ["<div", ">", "</div>"],
  _tmpl$16 = ["<span", "> <!--$-->", "<!--/--></span>"],
  _tmpl$17 = ["<span", "><!--$-->", "<!--/--> </span>"],
  _tmpl$18 = ["<div", ' normal="Search\u2026" title="Search&amp;hellip;"></div>'],
  _tmpl$19 = ["<div", "><div></div><!--$-->", "<!--/--></div>"];
const trailing = (() => {
  var _v$ = _$ssrHydrationKey();
  return _$ssr(_tmpl$, _v$);
})();
const leading = (() => {
  var _v$2 = _$ssrHydrationKey();
  return _$ssr(_tmpl$2, _v$2);
})();

/* prettier-ignore */
const extraSpaces = (() => {
  var _v$3 = _$ssrHydrationKey();
  return _$ssr(_tmpl$3, _v$3);
})();
const trailingExpr = (() => {
  var _v$4 = _$ssrHydrationKey(),
    _v$5 = _$escape(name);
  return _$ssr(_tmpl$4, _v$4, _v$5);
})();
const leadingExpr = (() => {
  var _v$6 = _$ssrHydrationKey(),
    _v$7 = _$escape(greeting);
  return _$ssr(_tmpl$5, _v$6, _v$7);
})();

/* prettier-ignore */
const multiExpr = (() => {
  var _v$8 = _$ssrHydrationKey(),
    _v$9 = _$escape(greeting),
    _v$10 = _$escape(name);
  return _$ssr(_tmpl$6, _v$8, _v$9, _v$10);
})();

/* prettier-ignore */
const multiExprSpaced = (() => {
  var _v$11 = _$ssrHydrationKey(),
    _v$12 = _$escape(greeting),
    _v$13 = _$escape(name);
  return _$ssr(_tmpl$7, _v$11, _v$12, _v$13);
})();

/* prettier-ignore */
const multiExprTogether = (() => {
  var _v$14 = _$ssrHydrationKey(),
    _v$15 = _$escape(greeting),
    _v$16 = _$escape(name);
  return _$ssr(_tmpl$8, _v$14, _v$15, _v$16);
})();

/* prettier-ignore */
const multiLine = (() => {
  var _v$17 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$17);
})();

/* prettier-ignore */
const multiLineTrailingSpace = (() => {
  var _v$18 = _$ssrHydrationKey();
  return _$ssr(_tmpl$3, _v$18);
})();

/* prettier-ignore */
const multiLineNoTrailingSpace = (() => {
  var _v$19 = _$ssrHydrationKey();
  return _$ssr(_tmpl$3, _v$19);
})();

/* prettier-ignore */
const escape = (() => {
  var _v$20 = _$ssrHydrationKey();
  return _$ssr(_tmpl$10, _v$20);
})();

/* prettier-ignore */
const escape2 = _$createComponent(Comp, {
  children: "\xA0<Hi>\xA0"
});

/* prettier-ignore */
const escape3 = "\xA0<Hi>\xA0";
const injection = (() => {
  var _v$21 = _$ssrHydrationKey();
  return _$ssr(_tmpl$11, _v$21);
})();
let value = "World";
const evaluated = (() => {
  var _v$22 = _$ssrHydrationKey();
  return _$ssr(_tmpl$12, _v$22);
})();
let number = 4 + 5;
const evaluatedNonString = (() => {
  var _v$23 = _$ssrHydrationKey();
  return _$ssr(_tmpl$13, _v$23);
})();
const newLineLiteral = (() => {
  var _v$24 = _$ssrHydrationKey(),
    _v$25 = _$escape(s);
  return _$ssr(_tmpl$14, _v$24, _v$25);
})();
const trailingSpace = (() => {
  var _v$26 = _$ssrHydrationKey(),
    _v$27 = _$escape(expr);
  return _$ssr(_tmpl$15, _v$26, _v$27);
})();
const trailingSpaceComp = _$createComponent(Comp, {
  children: expr
});
const trailingSpaceFrag = expr;
const leadingSpaceElement = (() => {
  var _v$28 = _$ssrHydrationKey(),
    _v$29 = _$escape(expr);
  return _$ssr(_tmpl$16, _v$28, _v$29);
})();
const leadingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [" ", expr];
  }
});
const leadingSpaceFragment = [" ", expr];
const trailingSpaceElement = (() => {
  var _v$30 = _$ssrHydrationKey(),
    _v$31 = _$escape(expr);
  return _$ssr(_tmpl$17, _v$30, _v$31);
})();
const trailingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [expr, " "];
  }
});
const trailingSpaceFragment = [expr, " "];
const escapeAttribute = (() => {
  var _v$32 = _$ssrHydrationKey();
  return _$ssr(_tmpl$18, _v$32);
})();
const escapeCompAttribute = _$createComponent(Div, {
  normal: "Search\u2026",
  title: "Search&hellip;"
});
const lastElementExpression = (() => {
  var _v$33 = _$ssrHydrationKey(),
    _v$34 = _$ssrRunInScope(() => _$escape(expr()));
  return _$ssr(_tmpl$19, _v$33, _v$34);
})();
