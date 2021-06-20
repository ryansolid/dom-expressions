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
  _tmpl$10 = ["<span", ">&nbsp;&lt;Hi&gt;&nbsp;</span>"];

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

const escape = _$ssr(_tmpl$10, _$ssrHydrationKey());
