import { template as _$template } from "r-dom";
import { createTextNode as _$createTextNode } from "r-dom";
import { insertNode as _$insertNode } from "r-dom";
import { setProp as _$setProp } from "r-dom";
import { createElement as _$createElement } from "r-dom";
import { effect as _$effect } from "r-dom";
import { getOwner as _$getOwner } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<my-element>`, true, false),
  _tmpl$2 = /*#__PURE__*/ _$template(`<my-element><header slot=head>Title`, true, false),
  _tmpl$3 = /*#__PURE__*/ _$template(`<slot name=head>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<a is=my-element>`, true, false),
  _tmpl$5 = /*#__PURE__*/ _$template(`<my-el>empty string`, true, false),
  _tmpl$6 = /*#__PURE__*/ _$template(`<my-el>js empty`, true, false),
  _tmpl$7 = /*#__PURE__*/ _$template(`<my-el>hola`, true, false),
  _tmpl$8 = /*#__PURE__*/ _$template(`<my-el>hola js`, true, false),
  _tmpl$9 = /*#__PURE__*/ _$template(`<my-el>true`, true, false),
  _tmpl$10 = /*#__PURE__*/ _$template(`<my-el>false`, true, false),
  _tmpl$11 = /*#__PURE__*/ _$template(`<my-el>1`, true, false),
  _tmpl$12 = /*#__PURE__*/ _$template(`<my-el>0`, true, false),
  _tmpl$13 = /*#__PURE__*/ _$template(`<my-el>undefined`, true, false),
  _tmpl$14 = /*#__PURE__*/ _$template(`<my-el>null`, true, false),
  _tmpl$15 = /*#__PURE__*/ _$template(`<my-el>boolTest()`, true, false),
  _tmpl$16 = /*#__PURE__*/ _$template(`<my-el>boolTest`, true, false),
  _tmpl$17 = /*#__PURE__*/ _$template(`<my-el>boolTestBinding`, true, false),
  _tmpl$18 = /*#__PURE__*/ _$template(`<my-el>boolTestObjBinding.value`, true, false),
  _tmpl$19 = /*#__PURE__*/ _$template(`<my-el>fn`, true, false),
  _tmpl$20 = /*#__PURE__*/ _$template(`<my-el before>should have space before`, true, false),
  _tmpl$21 = /*#__PURE__*/ _$template(
    `<my-el before after>should have space before/after`,
    true,
    false
  ),
  _tmpl$22 = /*#__PURE__*/ _$template(`<my-el after>should have space before/after`, true, false);
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
const template6 = (() => {
  var _el$6 = _$createElement("my-el");
  _$insertNode(_el$6, _$createTextNode(`empty string`));
  _$setProp(_el$6, "bool:quack", "");
  return _el$6;
})();
const template7 = (() => {
  var _el$8 = _$createElement("my-el");
  _$insertNode(_el$8, _$createTextNode(`js empty`));
  _$setProp(_el$8, "bool:quack", "");
  return _el$8;
})();
const template8 = (() => {
  var _el$10 = _$createElement("my-el");
  _$insertNode(_el$10, _$createTextNode(`hola`));
  _$setProp(_el$10, "bool:quack", "hola");
  return _el$10;
})();
const template9 = (() => {
  var _el$12 = _$createElement("my-el");
  _$insertNode(_el$12, _$createTextNode(`hola js`));
  _$setProp(_el$12, "bool:quack", "hola");
  return _el$12;
})();
const template10 = (() => {
  var _el$14 = _$createElement("my-el");
  _$insertNode(_el$14, _$createTextNode(`true`));
  _$setProp(_el$14, "bool:quack", true);
  return _el$14;
})();
const template11 = (() => {
  var _el$16 = _$createElement("my-el");
  _$insertNode(_el$16, _$createTextNode(`false`));
  _$setProp(_el$16, "bool:quack", false);
  return _el$16;
})();
const template12 = (() => {
  var _el$18 = _$createElement("my-el");
  _$insertNode(_el$18, _$createTextNode(`1`));
  _$setProp(_el$18, "bool:quack", 1);
  return _el$18;
})();
const template13 = (() => {
  var _el$20 = _$createElement("my-el");
  _$insertNode(_el$20, _$createTextNode(`0`));
  _$setProp(_el$20, "bool:quack", 0);
  return _el$20;
})();
const template14 = (() => {
  var _el$22 = _$createElement("my-el");
  _$insertNode(_el$22, _$createTextNode(`undefined`));
  _$setProp(_el$22, "bool:quack", undefined);
  return _el$22;
})();
const template15 = (() => {
  var _el$24 = _$createElement("my-el");
  _$insertNode(_el$24, _$createTextNode(`null`));
  _$setProp(_el$24, "bool:quack", null);
  return _el$24;
})();
const template16 = (() => {
  var _el$26 = _$createElement("my-el");
  _$insertNode(_el$26, _$createTextNode(`boolTest()`));
  _$effect(_$p => _$setProp(_el$26, "bool:quack", boolTest(), _$p));
  return _el$26;
})();
const template17 = (() => {
  var _el$28 = _$createElement("my-el");
  _$insertNode(_el$28, _$createTextNode(`boolTest`));
  _$setProp(_el$28, "bool:quack", boolTest);
  return _el$28;
})();
const template18 = (() => {
  var _el$30 = _$createElement("my-el");
  _$insertNode(_el$30, _$createTextNode(`boolTestBinding`));
  _$setProp(_el$30, "bool:quack", boolTestBinding);
  return _el$30;
})();
const template19 = (() => {
  var _el$32 = _$createElement("my-el");
  _$insertNode(_el$32, _$createTextNode(`boolTestObjBinding.value`));
  _$effect(_$p => _$setProp(_el$32, "bool:quack", boolTestObjBinding.value, _$p));
  return _el$32;
})();
const template20 = (() => {
  var _el$34 = _$createElement("my-el");
  _$insertNode(_el$34, _$createTextNode(`fn`));
  _$setProp(_el$34, "bool:quack", () => false);
  return _el$34;
})();
const template21 = (() => {
  var _el$36 = _$createElement("my-el");
  _$insertNode(_el$36, _$createTextNode(`should have space before`));
  _$setProp(_el$36, "before", true);
  _$setProp(_el$36, "bool:quack", "true");
  return _el$36;
})();
const template22 = (() => {
  var _el$38 = _$createElement("my-el");
  _$insertNode(_el$38, _$createTextNode(`should have space before/after`));
  _$setProp(_el$38, "before", true);
  _$setProp(_el$38, "bool:quack", "true");
  _$setProp(_el$38, "after", true);
  return _el$38;
})();
const template23 = (() => {
  var _el$40 = _$createElement("my-el");
  _$insertNode(_el$40, _$createTextNode(`should have space before/after`));
  _$setProp(_el$40, "bool:quack", "true");
  _$setProp(_el$40, "after", true);
  return _el$40;
})();
// this crash it for some reason- */ const template60 = <my-el bool:quack>really empty</my-el>;