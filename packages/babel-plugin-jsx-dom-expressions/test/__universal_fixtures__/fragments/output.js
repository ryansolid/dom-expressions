import { createComponent as _$createComponent } from "r-custom";
import { memo as _$memo } from "r-custom";
import { setProp as _$setProp } from "r-custom";
import { effect as _$effect } from "r-custom";
import { createTextNode as _$createTextNode } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { createElement as _$createElement } from "r-custom";
const multiStatic = [
  (() => {
    const _el$ = _$createElement("div");
    _$insertNode(_el$, _$createTextNode(`First`));
    return _el$;
  })(),
  (() => {
    const _el$3 = _$createElement("div");
    _$insertNode(_el$3, _$createTextNode(`Last`));
    return _el$3;
  })()
];
const multiExpression = [
  (() => {
    const _el$5 = _$createElement("div");
    _$insertNode(_el$5, _$createTextNode(`First`));
    return _el$5;
  })(),
  inserted,
  (() => {
    const _el$7 = _$createElement("div");
    _$insertNode(_el$7, _$createTextNode(`Last`));
    return _el$7;
  })(),
  "After"
];
const multiDynamic = [
  (() => {
    const _el$9 = _$createElement("div");
    _$insertNode(_el$9, _$createTextNode(`First`));
    _$effect(_$p => _$setProp(_el$9, "id", state.first, _$p));
    return _el$9;
  })(),
  _$memo(() => state.inserted),
  (() => {
    const _el$11 = _$createElement("div");
    _$insertNode(_el$11, _$createTextNode(`Last`));
    _$effect(_$p => _$setProp(_el$11, "id", state.last, _$p));
    return _el$11;
  })(),
  "After"
];
const singleExpression = inserted;
const singleDynamic = _$memo(inserted);
const firstStatic = [inserted, _$createElement("div")];
const firstDynamic = [_$memo(inserted), _$createElement("div")];
const firstComponent = [_$createComponent(Component, {}), _$createElement("div")];
const lastStatic = [_$createElement("div"), inserted];
const lastDynamic = [_$createElement("div"), _$memo(inserted)];
const lastComponent = [_$createElement("div"), _$createComponent(Component, {})];
const spaces = [
  (() => {
    const _el$19 = _$createElement("span");
    _$insertNode(_el$19, _$createTextNode(`1`));
    return _el$19;
  })(),
  " ",
  (() => {
    const _el$21 = _$createElement("span");
    _$insertNode(_el$21, _$createTextNode(`2`));
    return _el$21;
  })(),
  " ",
  (() => {
    const _el$23 = _$createElement("span");
    _$insertNode(_el$23, _$createTextNode(`3`));
    return _el$23;
  })()
];
const multiLineTrailing = [
  (() => {
    const _el$25 = _$createElement("span");
    _$insertNode(_el$25, _$createTextNode(`1`));
    return _el$25;
  })(),
  (() => {
    const _el$27 = _$createElement("span");
    _$insertNode(_el$27, _$createTextNode(`2`));
    return _el$27;
  })(),
  (() => {
    const _el$29 = _$createElement("span");
    _$insertNode(_el$29, _$createTextNode(`3`));
    return _el$29;
  })()
];
