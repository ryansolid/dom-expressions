import { ssr as _$ssr } from "r-dom";
import { escape as _$escape } from "r-dom";
const trailing = "<span>Hello </span>";
const leading = "<span> John</span>";
/* prettier-ignore */

const extraSpaces = "<span>Hello John</span>";

const trailingExpr = _$ssr(["<span>Hello ", "</span>"], _$escape(name));

const leadingExpr = _$ssr(["<span>", " John</span>"], _$escape(greeting));
/* prettier-ignore */

const multiExpr = _$ssr(["<span>", " ", "</span>"], _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiExprSpaced = _$ssr(["<span> ", " ", " </span>"], _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiExprTogether = _$ssr(["<span> ", "", " </span>"], _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiLine = "<span>Hello</span>";
/* prettier-ignore */

const multiLineTrailingSpace = "<span>Hello John</span>";
/* prettier-ignore */

const escape = "<span>&nbsp;&lt;Hi&gt;&nbsp;</span>";
