import { escape as _$escape } from "r-dom";
import { ssrAsync as _$ssrAsync } from "r-dom";

const trailing = _$ssrAsync("<span>Hello </span>");

const leading = _$ssrAsync("<span> John</span>");
/* prettier-ignore */

const extraSpaces = _$ssrAsync("<span>Hello John</span>");

const trailingExpr = _$ssrAsync(["<span>Hello ", "</span>"], _$escape(name));

const leadingExpr = _$ssrAsync(["<span>", " John</span>"], _$escape(greeting));
/* prettier-ignore */

const multiExpr = _$ssrAsync(["<span>", " ", "</span>"], _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiExprSpaced = _$ssrAsync(["<span> ", " ", " </span>"], _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiExprTogether = _$ssrAsync(["<span> ", "", " </span>"], _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiLine = _$ssrAsync("<span>Hello</span>");
/* prettier-ignore */

const multiLineTrailingSpace = _$ssrAsync("<span>Hello John</span>");
/* prettier-ignore */

const escape = _$ssrAsync("<span>&nbsp;&lt;Hi&gt;&nbsp;</span>");
