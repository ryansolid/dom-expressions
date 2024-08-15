import { template as _$template } from "r-dom";
import { effect as _$effect } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { getOwner as _$getOwner } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { setProperty as _$setProperty } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<my-element>`, true, false),
  _tmpl$2 = /*#__PURE__*/ _$template(`<my-element><header slot=head>Title`, true, false),
  _tmpl$3 = /*#__PURE__*/ _$template(`<slot name=head>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<a is=my-element>`, true, false);
const template = (() => {
  var _el$ = _$getNextElement(_tmpl$);
  _$setProperty(_el$, "someAttr", name);
  _$setProperty(_el$, "notprop", data);
  _$setAttribute(_el$, "my-attr", data);
  _el$.someProp = data;
  _el$._$owner = _$getOwner();
  return _el$;
})();
const template2 = (() => {
  var _el$2 = _$getNextElement(_tmpl$);
  _el$2._$owner = _$getOwner();
  _$effect(
    () => ({
      e: state.name,
      t: state.data,
      a: state.data,
      o: state.data
    }),
    ({ e, t, a, o }, _p$) => {
      e !== _p$.e && _$setProperty(_el$2, "someAttr", e);
      t !== _p$.t && _$setProperty(_el$2, "notprop", t);
      a !== _p$.a && _$setAttribute(_el$2, "my-attr", a);
      o !== _p$.o && (_el$2.someProp = o);
    },
    {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    }
  );
  return _el$2;
})();
const template3 = (() => {
  var _el$3 = _$getNextElement(_tmpl$2);
  _el$3._$owner = _$getOwner();
  return _el$3;
})();
const template4 = (() => {
  var _el$4 = _$getNextElement(_tmpl$3);
  _el$4._$owner = _$getOwner();
  return _el$4;
})();
const template5 = (() => {
  var _el$5 = _$getNextElement(_tmpl$4);
  _el$5._$owner = _$getOwner();
  return _el$5;
})();
