import { createComponent as _$createComponent } from "r-server";
import { escape as _$escape } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
const _tmpl$ = ["<span", ">Hello </span>"],
  _tmpl$2 = ["<span", "> John</span>"],
  _tmpl$3 = ["<span", ">Hello John</span>"],
  _tmpl$4 = ["<span", ">Hello <!--#-->", "<!--/--></span>"],
  _tmpl$5 = ["<span", "><!--#-->", "<!--/--> John</span>"],
  _tmpl$6 = ["<span", "><!--#-->", "<!--/--> <!--#-->", "<!--/--></span>"],
  _tmpl$7 = ["<span", "> <!--#-->", "<!--/--> <!--#-->", "<!--/--> </span>"],
  _tmpl$8 = ["<span", "> <!--#-->", "<!--/--><!--#-->", "<!--/--> </span>"],
  _tmpl$9 = ["<span", ">Hello</span>"],
  _tmpl$10 = ["<span", ">&nbsp;&lt;Hi&gt;&nbsp;</span>"],
  _tmpl$11 = ["<span", ">Hi&lt;script>alert();&lt;/script></span>"],
  _tmpl$12 = ["<span", ">Hello World!</span>"],
  _tmpl$13 = ["<span", ">4 + 5 = 9</span>"],
  _tmpl$14 = ["<div", "><!--#-->", "<!--/-->\nd</div>"],
  _tmpl$15 = ["<div", ">", "</div>"],
  _tmpl$16 = ["<span", "> <!--#-->", "<!--/--></span>"],
  _tmpl$17 = ["<span", "><!--#-->", "<!--/--> </span>"],
  _tmpl$18 = ["<div", ' normal="Search\u2026" title="Search&amp;hellip;"></div>'],
  _tmpl$19 = ["<div", "><div></div><!--#-->", "<!--/--></div>"];
const trailing = _$ssr(_tmpl$, _$ssrHydrationKey());
const leading = _$ssr(_tmpl$2, _$ssrHydrationKey());

/* prettier-ignore */
const extraSpaces = _$ssr(_tmpl$3, _$ssrHydrationKey());
const trailingExpr = _$ssr(_tmpl$4, _$ssrHydrationKey(), _$escape(name));
const leadingExpr = _$ssr(_tmpl$5, _$ssrHydrationKey(), _$escape(greeting));

/* prettier-ignore */
const multiExpr = _$ssr(_tmpl$6, _$ssrHydrationKey(), _$escape(greeting), _$escape(name));

/* prettier-ignore */
const multiExprSpaced = _$ssr(_tmpl$7, _$ssrHydrationKey(), _$escape(greeting), _$escape(name));

/* prettier-ignore */
const multiExprTogether = _$ssr(_tmpl$8, _$ssrHydrationKey(), _$escape(greeting), _$escape(name));

/* prettier-ignore */
const multiLine = _$ssr(_tmpl$9, _$ssrHydrationKey());

/* prettier-ignore */
const multiLineTrailingSpace = _$ssr(_tmpl$3, _$ssrHydrationKey());

/* prettier-ignore */
const multiLineNoTrailingSpace = _$ssr(_tmpl$3, _$ssrHydrationKey());

/* prettier-ignore */
const escape = _$ssr(_tmpl$10, _$ssrHydrationKey());

/* prettier-ignore */
const escape2 = _$createComponent(Comp, {
  children: "\xA0<Hi>\xA0"
});

/* prettier-ignore */
const escape3 = "\xA0<Hi>\xA0";
const injection = _$ssr(_tmpl$11, _$ssrHydrationKey());
let value = "World";
const evaluated = _$ssr(_tmpl$12, _$ssrHydrationKey());
let number = 4 + 5;
const evaluatedNonString = _$ssr(_tmpl$13, _$ssrHydrationKey());
const newLineLiteral = _$ssr(_tmpl$14, _$ssrHydrationKey(), _$escape(s));
const trailingSpace = _$ssr(_tmpl$15, _$ssrHydrationKey(), _$escape(expr));
const trailingSpaceComp = _$createComponent(Comp, {
  children: expr
});
const trailingSpaceFrag = expr;
const leadingSpaceElement = _$ssr(_tmpl$16, _$ssrHydrationKey(), _$escape(expr));
const leadingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [" ", expr];
  }
});
const leadingSpaceFragment = [" ", expr];
const trailingSpaceElement = _$ssr(_tmpl$17, _$ssrHydrationKey(), _$escape(expr));
const trailingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [expr, " "];
  }
});
const trailingSpaceFragment = [expr, " "];
const escapeAttribute = _$ssr(_tmpl$18, _$ssrHydrationKey());
const escapeCompAttribute = _$createComponent(Div, {
  normal: "Search\u2026",
  title: "Search&hellip;"
});
const lastElementExpression = _$ssr(_tmpl$19, _$ssrHydrationKey(), _$escape(expr()));
