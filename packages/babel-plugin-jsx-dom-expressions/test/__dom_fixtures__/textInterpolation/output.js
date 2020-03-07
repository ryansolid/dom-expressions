import { template as _$template } from "r-dom";
import { insert as _$insert } from "r-dom";

const _tmpl$ = _$template(`<span>Hello </span>`),
  _tmpl$2 = _$template(`<span> John</span>`),
  _tmpl$3 = _$template(`<span>Hello John</span>`),
  _tmpl$4 = _$template(`<span> </span>`),
  _tmpl$5 = _$template(`<span> <!----> <!----> </span>`),
  _tmpl$6 = _$template(`<span>Hello</span>`),
  _tmpl$7 = _$template(`<span>&nbsp;&lt;Hi&gt;&nbsp;</span>`);

const trailing = _tmpl$.cloneNode(true);

const leading = _tmpl$2.cloneNode(true);
/* prettier-ignore */

const extraSpaces = _tmpl$3.cloneNode(true);

const trailingExpr = (function() {
  const _el$4 = _tmpl$.cloneNode(true),
    _el$5 = _el$4.firstChild;

  _$insert(_el$4, name, null);

  return _el$4;
})();

const leadingExpr = (function() {
  const _el$6 = _tmpl$2.cloneNode(true),
    _el$7 = _el$6.firstChild;

  _$insert(_el$6, greeting, _el$7);

  return _el$6;
})();
/* prettier-ignore */

const multiExpr = function () {
  const _el$8 = _tmpl$4.cloneNode(true),
        _el$9 = _el$8.firstChild;

  _$insert(_el$8, greeting, _el$9);

  _$insert(_el$8, name, null);

  return _el$8;
}();
/* prettier-ignore */

const multiExprSpaced = function () {
  const _el$10 = _tmpl$5.cloneNode(true),
        _el$11 = _el$10.firstChild,
        _el$14 = _el$11.nextSibling,
        _el$12 = _el$14.nextSibling,
        _el$15 = _el$12.nextSibling,
        _el$13 = _el$15.nextSibling;

  _$insert(_el$10, greeting, _el$14);

  _$insert(_el$10, name, _el$15);

  return _el$10;
}();
/* prettier-ignore */

const multiLine = _tmpl$6.cloneNode(true);
/* prettier-ignore */

const multiLineTrailingSpace = _tmpl$3.cloneNode(true);
/* prettier-ignore */

const escape = _tmpl$7.cloneNode(true);
