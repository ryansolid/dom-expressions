import { escape as _$escape } from "r-server";
import { ssr as _$ssr } from "r-server";
import { getHydrationKey as _$getHydrationKey } from "r-server";
const _tmpl$ = ['<span data-hk="', '">Hello </span>'],
  _tmpl$2 = ['<span data-hk="', '"> John</span>'],
  _tmpl$3 = ['<span data-hk="', '">Hello John</span>'],
  _tmpl$4 = ['<span data-hk="', '">Hello <!--#-->', "<!--/--></span>"],
  _tmpl$5 = ['<span data-hk="', '"><!--#-->', "<!--/--> John</span>"],
  _tmpl$6 = ['<span data-hk="', '"><!--#-->', "<!--/--> <!--#-->", "<!--/--></span>"],
  _tmpl$7 = ['<span data-hk="', '"> <!--#-->', "<!--/--> <!--#-->", "<!--/--> </span>"],
  _tmpl$8 = ['<span data-hk="', '"> <!--#-->', "<!--/--><!--#-->", "<!--/--> </span>"],
  _tmpl$9 = ['<span data-hk="', '">Hello</span>'],
  _tmpl$10 = ['<span data-hk="', '">&nbsp;&lt;Hi&gt;&nbsp;</span>'];

const trailing = _$ssr(_tmpl$, _$getHydrationKey());

const leading = _$ssr(_tmpl$2, _$getHydrationKey());
/* prettier-ignore */

const extraSpaces = _$ssr(_tmpl$3, _$getHydrationKey());

const trailingExpr = _$ssr(_tmpl$4, _$getHydrationKey(), _$escape(name));

const leadingExpr = _$ssr(_tmpl$5, _$getHydrationKey(), _$escape(greeting));
/* prettier-ignore */

const multiExpr = _$ssr(_tmpl$6, _$getHydrationKey(), _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiExprSpaced = _$ssr(_tmpl$7, _$getHydrationKey(), _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiExprTogether = _$ssr(_tmpl$8, _$getHydrationKey(), _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiLine = _$ssr(_tmpl$9, _$getHydrationKey());
/* prettier-ignore */

const multiLineTrailingSpace = _$ssr(_tmpl$3, _$getHydrationKey());
/* prettier-ignore */

const escape = _$ssr(_tmpl$10, _$getHydrationKey());
