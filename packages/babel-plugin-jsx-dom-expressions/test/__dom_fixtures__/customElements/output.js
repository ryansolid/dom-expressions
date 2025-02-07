import { template as _$template } from "r-dom";
import { setBoolAttribute as _$setBoolAttribute } from "r-dom";
import { effect as _$effect } from "r-dom";
import { getOwner as _$getOwner } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<my-element>`, true, false, false),
  _tmpl$2 = /*#__PURE__*/ _$template(`<my-element><header slot=head>Title`, true, false, false),
  _tmpl$3 = /*#__PURE__*/ _$template(`<slot name=head>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<a is=my-element>`, true, false, false),
  _tmpl$5 = /*#__PURE__*/ _$template(`<my-el>empty string`, true, false, false),
  _tmpl$6 = /*#__PURE__*/ _$template(`<my-el>js empty`, true, false, false),
  _tmpl$7 = /*#__PURE__*/ _$template(`<my-el quack>hola`, true, false, false),
  _tmpl$8 = /*#__PURE__*/ _$template(`<my-el quack>"hola js"`, true, false, false),
  _tmpl$9 = /*#__PURE__*/ _$template(`<my-el quack>true`, true, false, false),
  _tmpl$10 = /*#__PURE__*/ _$template(`<my-el>false`, true, false, false),
  _tmpl$11 = /*#__PURE__*/ _$template(`<my-el quack>1`, true, false, false),
  _tmpl$12 = /*#__PURE__*/ _$template(`<my-el>0`, true, false, false),
  _tmpl$13 = /*#__PURE__*/ _$template(`<my-el quack>"1"`, true, false, false),
  _tmpl$14 = /*#__PURE__*/ _$template(`<my-el>"0"`, true, false, false),
  _tmpl$15 = /*#__PURE__*/ _$template(`<my-el>undefined`, true, false, false),
  _tmpl$16 = /*#__PURE__*/ _$template(`<my-el>null`, true, false, false),
  _tmpl$17 = /*#__PURE__*/ _$template(`<my-el>boolTest()`, true, false, false),
  _tmpl$18 = /*#__PURE__*/ _$template(`<my-el>boolTest`, true, false, false),
  _tmpl$19 = /*#__PURE__*/ _$template(`<my-el>boolTestBinding`, true, false, false),
  _tmpl$20 = /*#__PURE__*/ _$template(`<my-el>boolTestObjBinding.value`, true, false, false),
  _tmpl$21 = /*#__PURE__*/ _$template(`<my-el>fn`, true, false, false),
  _tmpl$22 = /*#__PURE__*/ _$template(
    `<my-el before quack>should have space before`,
    true,
    false,
    false
  ),
  _tmpl$23 = /*#__PURE__*/ _$template(
    `<my-el before quack after>should have space before/after`,
    true,
    false,
    false
  ),
  _tmpl$24 = /*#__PURE__*/ _$template(
    `<my-el quack after>should have space before/after`,
    true,
    false,
    false
  );
const template = (() => {
  var _el$ = _tmpl$();
  _el$.someAttr = name;
  _el$.notprop = data;
  _$setAttribute(_el$, "my-attr", data);
  _el$.someProp = data;
  _el$._$owner = _$getOwner();
  return _el$;
})();
const template2 = (() => {
  var _el$2 = _tmpl$();
  _el$2._$owner = _$getOwner();
  _$effect(
    _p$ => {
      var _v$ = state.name,
        _v$2 = state.data,
        _v$3 = state.data,
        _v$4 = state.data;
      _v$ !== _p$.e && (_el$2.someAttr = _p$.e = _v$);
      _v$2 !== _p$.t && (_el$2.notprop = _p$.t = _v$2);
      _v$3 !== _p$.a && _$setAttribute(_el$2, "my-attr", (_p$.a = _v$3));
      _v$4 !== _p$.o && (_el$2.someProp = _p$.o = _v$4);
      return _p$;
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
  var _el$3 = _tmpl$2();
  _el$3._$owner = _$getOwner();
  return _el$3;
})();
const template4 = (() => {
  var _el$4 = _tmpl$3();
  _el$4._$owner = _$getOwner();
  return _el$4;
})();
const template5 = (() => {
  var _el$5 = _tmpl$4();
  _el$5._$owner = _$getOwner();
  return _el$5;
})();

// bool:
function boolTest() {
  return true;
}
const boolTestBinding = false;
const boolTestObjBinding = {
  value: false
};
const template42 = (() => {
  var _el$6 = _tmpl$5();
  _el$6._$owner = _$getOwner();
  return _el$6;
})();
const template43 = (() => {
  var _el$7 = _tmpl$6();
  _el$7._$owner = _$getOwner();
  return _el$7;
})();
const template44 = (() => {
  var _el$8 = _tmpl$7();
  _el$8._$owner = _$getOwner();
  return _el$8;
})();
const template45 = (() => {
  var _el$9 = _tmpl$8();
  _el$9._$owner = _$getOwner();
  return _el$9;
})();
const template46 = (() => {
  var _el$10 = _tmpl$9();
  _el$10._$owner = _$getOwner();
  return _el$10;
})();
const template47 = (() => {
  var _el$11 = _tmpl$10();
  _el$11._$owner = _$getOwner();
  return _el$11;
})();
const template48 = (() => {
  var _el$12 = _tmpl$11();
  _el$12._$owner = _$getOwner();
  return _el$12;
})();
const template49 = (() => {
  var _el$13 = _tmpl$12();
  _el$13._$owner = _$getOwner();
  return _el$13;
})();
const template50 = (() => {
  var _el$14 = _tmpl$13();
  _el$14._$owner = _$getOwner();
  return _el$14;
})();
const template51 = (() => {
  var _el$15 = _tmpl$14();
  _el$15._$owner = _$getOwner();
  return _el$15;
})();
const template52 = (() => {
  var _el$16 = _tmpl$15();
  _el$16._$owner = _$getOwner();
  return _el$16;
})();
const template53 = (() => {
  var _el$17 = _tmpl$16();
  _el$17._$owner = _$getOwner();
  return _el$17;
})();
const template54 = (() => {
  var _el$18 = _tmpl$17();
  _el$18._$owner = _$getOwner();
  _$effect(() => _$setBoolAttribute(_el$18, "quack", boolTest()));
  return _el$18;
})();
const template55 = (() => {
  var _el$19 = _tmpl$18();
  _$setBoolAttribute(_el$19, "quack", boolTest);
  _el$19._$owner = _$getOwner();
  return _el$19;
})();
const template56 = (() => {
  var _el$20 = _tmpl$19();
  _$setBoolAttribute(_el$20, "quack", boolTestBinding);
  _el$20._$owner = _$getOwner();
  return _el$20;
})();
const template57 = (() => {
  var _el$21 = _tmpl$20();
  _el$21._$owner = _$getOwner();
  _$effect(() => _$setBoolAttribute(_el$21, "quack", boolTestObjBinding.value));
  return _el$21;
})();
const template58 = (() => {
  var _el$22 = _tmpl$21();
  _$setBoolAttribute(_el$22, "quack", () => false);
  _el$22._$owner = _$getOwner();
  return _el$22;
})();
const template59 = (() => {
  var _el$23 = _tmpl$22();
  _el$23._$owner = _$getOwner();
  return _el$23;
})();
const template60 = (() => {
  var _el$24 = _tmpl$23();
  _el$24._$owner = _$getOwner();
  return _el$24;
})();
const template61 = (() => {
  var _el$25 = _tmpl$24();
  _el$25._$owner = _$getOwner();
  return _el$25;
})();
// this crash it for some reason- */ const template62 = <div bool:quack>really empty</div>;
