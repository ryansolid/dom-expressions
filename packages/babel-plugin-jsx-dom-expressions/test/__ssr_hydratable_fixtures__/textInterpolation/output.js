import { escape as _$escape } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";
const trailing = _$ssr`<span _hk="${_$getHydrationKey()}">Hello </span>`;
const leading = _$ssr`<span _hk="${_$getHydrationKey()}"> John</span>`;
/* prettier-ignore */

const extraSpaces = _$ssr`<span _hk="${_$getHydrationKey()}">Hello John</span>`;
const trailingExpr = _$ssr`<span _hk="${_$getHydrationKey()}">Hello <!--#-->${_$escape(
  name
)}<!--/--></span>`;
const leadingExpr = _$ssr`<span _hk="${_$getHydrationKey()}"><!--#-->${_$escape(
  greeting
)}<!--/--> John</span>`;
/* prettier-ignore */

const multiExpr = _$ssr`<span _hk="${_$getHydrationKey()}"><!--#-->${_$escape(greeting)}<!--/--> <!--#-->${_$escape(name)}<!--/--></span>`;
/* prettier-ignore */

const multiExprSpaced = _$ssr`<span _hk="${_$getHydrationKey()}"> <!--#-->${_$escape(greeting)}<!--/--> <!--#-->${_$escape(name)}<!--/--> </span>`;
/* prettier-ignore */

const multiExprTogether = _$ssr`<span _hk="${_$getHydrationKey()}"> <!--#-->${_$escape(greeting)}<!--/--><!--#-->${_$escape(name)}<!--/--> </span>`;
/* prettier-ignore */

const multiLine = _$ssr`<span _hk="${_$getHydrationKey()}">Hello</span>`;
/* prettier-ignore */

const multiLineTrailingSpace = _$ssr`<span _hk="${_$getHydrationKey()}">Hello John</span>`;
/* prettier-ignore */

const escape = _$ssr`<span _hk="${_$getHydrationKey()}">&nbsp;&lt;Hi&gt;&nbsp;</span>`;
