import { escape as _$escape } from "r-dom";
import { ssrStream as _$ssrStream } from "r-dom";

const trailing = _$ssrStream("<span>Hello </span>");

const leading = _$ssrStream("<span> John</span>");
/* prettier-ignore */

const extraSpaces = _$ssrStream("<span>Hello John</span>");

const trailingExpr = _$ssrStream(["<span>Hello ", "</span>"], _$escape(name));

const leadingExpr = _$ssrStream(["<span>", " John</span>"], _$escape(greeting));
/* prettier-ignore */

const multiExpr = _$ssrStream(["<span>", " ", "</span>"], _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiExprSpaced = _$ssrStream(["<span> ", " ", " </span>"], _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiExprTogether = _$ssrStream(["<span> ", "", " </span>"], _$escape(greeting), _$escape(name));
/* prettier-ignore */

const multiLine = _$ssrStream("<span>Hello</span>");
/* prettier-ignore */

const multiLineTrailingSpace = _$ssrStream("<span>Hello John</span>");
/* prettier-ignore */

const escape = _$ssrStream("<span>&nbsp;&lt;Hi&gt;&nbsp;</span>");
