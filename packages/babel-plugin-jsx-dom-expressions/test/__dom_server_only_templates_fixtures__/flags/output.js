import { template as _$template } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { getNextMarker as _$getNextMarker } from "r-dom";
import { insert as _$insert } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<div><h1>Hello</h1><!$><!/><!$><!/><span>More Text`),
  _tmpl$2 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<span>`);
const template = (() => {
  var _el$ = _$getNextElement(_tmpl$),
    _el$2 = _el$.firstChild,
    _el$4 = _el$2.nextSibling,
    [_el$5, _co$] = _$getNextMarker(_el$4.nextSibling),
    _el$6 = _el$5.nextSibling,
    [_el$7, _co$2] = _$getNextMarker(_el$6.nextSibling),
    _el$3 = _el$7.nextSibling;
  _$insert(_el$, _$createComponent(Component, {}), _el$5, _co$);
  _$insert(_el$, () => state.interpolation, _el$7, _co$2);
  return _el$;
})();
const template2 = _$createComponent(Component, {
  get children() {
    return _$getNextElement(_tmpl$2);
  }
});
const template3 = _$createComponent(Component, {
  get children() {
    return [_$getNextElement(_tmpl$2), _$getNextElement(_tmpl$3)];
  }
});
const template4 = _$getNextElement(_tmpl$2);
