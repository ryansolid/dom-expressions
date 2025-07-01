import { setProp as _$setProp } from "r-custom";
import { createComponent as _$createComponent } from "r-custom";
import { insert as _$insert } from "r-custom";
import { createTextNode as _$createTextNode } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { createElement as _$createElement } from "r-custom";
const trailing = (() => {
  var _el$ = _$createElement("span");
  _$insertNode(_el$, _$createTextNode(`Hello `));
  return _el$;
})();
const leading = (() => {
  var _el$3 = _$createElement("span");
  _$insertNode(_el$3, _$createTextNode(` John`));
  return _el$3;
})();

/* prettier-ignore */
const extraSpaces = (() => {
  var _el$5 = _$createElement("span");
  _$insertNode(_el$5, _$createTextNode(`Hello John`));
  return _el$5;
})();
const trailingExpr = (() => {
  var _el$7 = _$createElement("span"),
    _el$8 = _$createTextNode(`Hello `);
  _$insertNode(_el$7, _el$8);
  _$insert(_el$7, name, null);
  return _el$7;
})();
const leadingExpr = (() => {
  var _el$9 = _$createElement("span"),
    _el$0 = _$createTextNode(` John`);
  _$insertNode(_el$9, _el$0);
  _$insert(_el$9, greeting, _el$0);
  return _el$9;
})();

/* prettier-ignore */
const multiExpr = (() => {
  var _el$1 = _$createElement("span"),
    _el$10 = _$createTextNode(` `);
  _$insertNode(_el$1, _el$10);
  _$insert(_el$1, greeting, _el$10);
  _$insert(_el$1, name, null);
  return _el$1;
})();

/* prettier-ignore */
const multiExprSpaced = (() => {
  var _el$11 = _$createElement("span"),
    _el$12 = _$createTextNode(` `),
    _el$13 = _$createTextNode(` `),
    _el$14 = _$createTextNode(` `);
  _$insertNode(_el$11, _el$12);
  _$insertNode(_el$11, _el$13);
  _$insertNode(_el$11, _el$14);
  _$insert(_el$11, greeting, _el$13);
  _$insert(_el$11, name, _el$14);
  return _el$11;
})();

/* prettier-ignore */
const multiExprTogether = (() => {
  var _el$15 = _$createElement("span"),
    _el$16 = _$createTextNode(` `),
    _el$17 = _$createTextNode(` `);
  _$insertNode(_el$15, _el$16);
  _$insertNode(_el$15, _el$17);
  _$insert(_el$15, greeting, _el$17);
  _$insert(_el$15, name, _el$17);
  return _el$15;
})();

/* prettier-ignore */
const multiLine = (() => {
  var _el$18 = _$createElement("span");
  _$insertNode(_el$18, _$createTextNode(`Hello`));
  return _el$18;
})();

/* prettier-ignore */
const multiLineTrailingSpace = (() => {
  var _el$20 = _$createElement("span");
  _$insertNode(_el$20, _$createTextNode(`Hello John`));
  return _el$20;
})();

/* prettier-ignore */
const multiLineNoTrailingSpace = (() => {
  var _el$22 = _$createElement("span");
  _$insertNode(_el$22, _$createTextNode(`Hello John`));
  return _el$22;
})();

/* prettier-ignore */
const escape = (() => {
  var _el$24 = _$createElement("span");
  _$insertNode(_el$24, _$createTextNode(`&nbsp;&lt;Hi&gt;&nbsp;`));
  return _el$24;
})();

/* prettier-ignore */
const escape2 = _$createComponent(Comp, {
  children: "\xA0<Hi>\xA0"
});

/* prettier-ignore */
const escape3 = "\xA0<Hi>\xA0";
const injection = (() => {
  var _el$26 = _$createElement("span"),
    _el$27 = _$createTextNode(`Hi&lt;script>alert();&lt;/script>`);
  _$insertNode(_el$26, _el$27);
  return _el$26;
})();
let value = "World";
const evaluated = (() => {
  var _el$29 = _$createElement("span"),
    _el$30 = _$createTextNode(`Hello World!`);
  _$insertNode(_el$29, _el$30);
  return _el$29;
})();
let number = 4 + 5;
const evaluatedNonString = (() => {
  var _el$32 = _$createElement("span"),
    _el$33 = _$createTextNode(`4 + 5 = 9`);
  _$insertNode(_el$32, _el$33);
  return _el$32;
})();
const newLineLiteral = (() => {
  var _el$35 = _$createElement("div"),
    _el$36 = _$createTextNode(`\nd`);
  _$insertNode(_el$35, _el$36);
  _$insert(_el$35, s, _el$36);
  return _el$35;
})();
const trailingSpace = (() => {
  var _el$38 = _$createElement("div");
  _$insert(_el$38, expr);
  return _el$38;
})();
const trailingSpaceComp = _$createComponent(Comp, {
  children: expr
});
const trailingSpaceFrag = expr;
const leadingSpaceElement = (() => {
  var _el$39 = _$createElement("span"),
    _el$40 = _$createTextNode(` `);
  _$insertNode(_el$39, _el$40);
  _$insert(_el$39, expr, null);
  return _el$39;
})();
const leadingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [" ", expr];
  }
});
const leadingSpaceFragment = [" ", expr];
const trailingSpaceElement = (() => {
  var _el$41 = _$createElement("span"),
    _el$42 = _$createTextNode(` `);
  _$insertNode(_el$41, _el$42);
  _$insert(_el$41, expr, _el$42);
  return _el$41;
})();
const trailingSpaceComponent = _$createComponent(Div, {
  get children() {
    return [expr, " "];
  }
});
const trailingSpaceFragment = [expr, " "];
const escapeAttribute = (() => {
  var _el$43 = _$createElement("div");
  _$setProp(_el$43, "normal", "Search&hellip;");
  _$setProp(_el$43, "title", "Search&hellip;");
  return _el$43;
})();
const escapeCompAttribute = _$createComponent(Div, {
  normal: "Search\u2026",
  title: "Search&hellip;"
});
