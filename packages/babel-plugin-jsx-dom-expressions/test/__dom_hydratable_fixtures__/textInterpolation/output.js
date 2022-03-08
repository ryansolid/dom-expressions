import { template as _$template } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { getNextMarker as _$getNextMarker } from "r-dom";
import { insert as _$insert } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";

const _tmpl$ = /*#__PURE__*/ _$template(`<span>Hello </span>`, 2),
  _tmpl$2 = /*#__PURE__*/ _$template(`<span> John</span>`, 2),
  _tmpl$3 = /*#__PURE__*/ _$template(`<span>Hello John</span>`, 2),
  _tmpl$4 = /*#__PURE__*/ _$template(`<span>Hello <!#><!/></span>`, 4),
  _tmpl$5 = /*#__PURE__*/ _$template(`<span><!#><!/> John</span>`, 4),
  _tmpl$6 = /*#__PURE__*/ _$template(`<span><!#><!/> <!#><!/></span>`, 6),
  _tmpl$7 = /*#__PURE__*/ _$template(`<span> <!#><!/> <!#><!/> </span>`, 6),
  _tmpl$8 = /*#__PURE__*/ _$template(`<span> <!#><!/><!#><!/> </span>`, 6),
  _tmpl$9 = /*#__PURE__*/ _$template(`<span>Hello</span>`, 2),
  _tmpl$10 = /*#__PURE__*/ _$template(`<span>&nbsp;&lt;Hi&gt;&nbsp;</span>`, 2),
  _tmpl$11 = /*#__PURE__*/ _$template(`<span>Hi&lt;script>alert();&lt;/script></span>`, 2),
  _tmpl$12 = /*#__PURE__*/ _$template(`<span>Hello World!</span>`, 2),
  _tmpl$13 = /*#__PURE__*/ _$template(`<span>4 + 5 = 9</span>`, 2),
  _tmpl$14 = /*#__PURE__*/ _$template(
    `<div><!#><!/>
d</div>`,
    4
  ),
  _tmpl$15 = /*#__PURE__*/ _$template(`<div></div>`, 2);

const trailing = _$getNextElement(_tmpl$);

const leading = _$getNextElement(_tmpl$2);
/* prettier-ignore */

const extraSpaces = _$getNextElement(_tmpl$3);

const trailingExpr = (() => {
  const _el$4 = _$getNextElement(_tmpl$4),
    _el$5 = _el$4.firstChild,
    _el$6 = _el$5.nextSibling,
    [_el$7, _co$] = _$getNextMarker(_el$6.nextSibling);

  _$insert(_el$4, name, _el$7, _co$);

  return _el$4;
})();

const leadingExpr = (() => {
  const _el$8 = _$getNextElement(_tmpl$5),
    _el$10 = _el$8.firstChild,
    [_el$11, _co$2] = _$getNextMarker(_el$10.nextSibling),
    _el$9 = _el$11.nextSibling;

  _$insert(_el$8, greeting, _el$11, _co$2);

  return _el$8;
})();
/* prettier-ignore */

const multiExpr = (() => {
  const _el$12 = _$getNextElement(_tmpl$6),
        _el$14 = _el$12.firstChild,
        [_el$15, _co$3] = _$getNextMarker(_el$14.nextSibling),
        _el$13 = _el$15.nextSibling,
        _el$16 = _el$13.nextSibling,
        [_el$17, _co$4] = _$getNextMarker(_el$16.nextSibling);

  _$insert(_el$12, greeting, _el$15, _co$3);

  _$insert(_el$12, name, _el$17, _co$4);

  return _el$12;
})();
/* prettier-ignore */

const multiExprSpaced = (() => {
  const _el$18 = _$getNextElement(_tmpl$7),
        _el$19 = _el$18.firstChild,
        _el$22 = _el$19.nextSibling,
        [_el$23, _co$5] = _$getNextMarker(_el$22.nextSibling),
        _el$20 = _el$23.nextSibling,
        _el$24 = _el$20.nextSibling,
        [_el$25, _co$6] = _$getNextMarker(_el$24.nextSibling),
        _el$21 = _el$25.nextSibling;

  _$insert(_el$18, greeting, _el$23, _co$5);

  _$insert(_el$18, name, _el$25, _co$6);

  return _el$18;
})();
/* prettier-ignore */

const multiExprTogether = (() => {
  const _el$26 = _$getNextElement(_tmpl$8),
        _el$27 = _el$26.firstChild,
        _el$29 = _el$27.nextSibling,
        [_el$30, _co$7] = _$getNextMarker(_el$29.nextSibling),
        _el$31 = _el$30.nextSibling,
        [_el$32, _co$8] = _$getNextMarker(_el$31.nextSibling),
        _el$28 = _el$32.nextSibling;

  _$insert(_el$26, greeting, _el$30, _co$7);

  _$insert(_el$26, name, _el$32, _co$8);

  return _el$26;
})();
/* prettier-ignore */

const multiLine = _$getNextElement(_tmpl$9);
/* prettier-ignore */

const multiLineTrailingSpace = _$getNextElement(_tmpl$3);
/* prettier-ignore */

const multiLineNoTrailingSpace = _$getNextElement(_tmpl$3);
/* prettier-ignore */

const escape = _$getNextElement(_tmpl$10);
/* prettier-ignore */

const escape2 = _$createComponent(Comp, {
  children: "\xA0<Hi>\xA0"
});
/* prettier-ignore */

const escape3 = "\xA0<Hi>\xA0";

const injection = _$getNextElement(_tmpl$11);

let value = "World";

const evaluated = _$getNextElement(_tmpl$12);

let number = 4 + 5;

const evaluatedNonString = _$getNextElement(_tmpl$13);

const newLineLiteral = (() => {
  const _el$40 = _$getNextElement(_tmpl$14),
    _el$42 = _el$40.firstChild,
    [_el$43, _co$9] = _$getNextMarker(_el$42.nextSibling),
    _el$41 = _el$43.nextSibling;

  _$insert(_el$40, s, _el$43, _co$9);

  return _el$40;
})();

const trailingSpace = (() => {
  const _el$44 = _$getNextElement(_tmpl$15);

  _$insert(_el$44, expr);

  return _el$44;
})();

const trailingSpaceComp = _$createComponent(Comp, {
  children: expr
});

const trailingSpaceFrag = expr;
