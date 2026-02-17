import { template as _$template } from "r-dom";
import { style as _$style } from "r-dom";
import { effect as _$effect } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<div>`);
const template1 = (() => {
  var _el$ = _tmpl$();
  _$effect(_$p => _$style(_el$, (() => `color: red`)(), _$p));
  return _el$;
})();
const template2 = (() => {
  var _el$2 = _tmpl$();
  _$effect(_$p => _$style(_el$2, (() => someStyle())(), _$p));
  return _el$2;
})();
const template3 = (() => {
  var _el$3 = _tmpl$();
  _$effect(_$p =>
    _$style(
      _el$3,
      (() => ({
        color: "red"
      }))(),
      _$p
    )
  );
  return _el$3;
})();
const template4 = (() => {
  var _el$4 = _tmpl$();
  _$effect(_$p =>
    _$style(
      _el$4,
      (() => ({
        "background-color": color(),
        "margin-right": "40px"
      }))(),
      _$p
    )
  );
  return _el$4;
})();
const template5 = (() => {
  var _el$5 = _tmpl$();
  _$effect(_$p =>
    _$style(
      _el$5,
      (() => ({
        background: "red",
        color: "green",
        margin: 3,
        padding: 0.4
      }))(),
      _$p
    )
  );
  return _el$5;
})();
const template6 = (() => {
  var _el$6 = _tmpl$();
  _$effect(_$p =>
    _$style(
      _el$6,
      (() => ({
        background: "red",
        color: "green",
        border: signal()
      }))(),
      _$p
    )
  );
  return _el$6;
})();
const template7 = (() => {
  var _el$7 = _tmpl$();
  _$effect(_$p =>
    _$style(
      _el$7,
      (() => ({
        background: "red",
        color: "green",
        border: undefined
      }))(),
      _$p
    )
  );
  return _el$7;
})();
const template8 = (() => {
  var _el$8 = _tmpl$();
  _$effect(_$p => _$style(_el$8, (() => ({}))(), _$p));
  return _el$8;
})();
