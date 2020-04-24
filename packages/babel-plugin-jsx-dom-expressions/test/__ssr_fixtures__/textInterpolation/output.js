import { ssr as _$ssr } from "r-dom";
const trailing = "<span>Hello </span>";
const leading = "<span> John</span>";
/* prettier-ignore */

const extraSpaces = "<span>Hello John</span>";
const trailingExpr = _$ssr`<span>Hello ${name}</span>`;
const leadingExpr = _$ssr`<span>${greeting} John</span>`;
/* prettier-ignore */

const multiExpr = _$ssr`<span>${greeting} ${name}</span>`;
/* prettier-ignore */

const multiExprSpaced = _$ssr`<span> ${greeting} ${name} </span>`;
/* prettier-ignore */

const multiLine = "<span>Hello</span>";
/* prettier-ignore */

const multiLineTrailingSpace = "<span>Hello John</span>";
/* prettier-ignore */

const escape = "<span>&nbsp;&lt;Hi&gt;&nbsp;</span>";
