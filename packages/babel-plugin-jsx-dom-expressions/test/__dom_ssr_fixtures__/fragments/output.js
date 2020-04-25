import { template as _$template } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { memo as _$memo } from "r-dom";
import { effect as _$effect } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";

const _tmpl$ = _$template(`<div>First</div>`, 2),
  _tmpl$2 = _$template(`<div>Last</div>`, 2),
  _tmpl$3 = _$template(`<div></div>`, 2);

const multiStatic = [_$getNextElement(_tmpl$, true), _$getNextElement(_tmpl$2, true)];
const multiExpression = [
  _$getNextElement(_tmpl$, true),
  inserted,
  _$getNextElement(_tmpl$2, true),
  "After"
];
const multiDynamic = [
  (() => {
    const _el$5 = _$getNextElement(_tmpl$, true);

    _$effect(() => (_el$5.id = state.first));

    return _el$5;
  })(),
  _$memo(() => state.inserted),
  (() => {
    const _el$6 = _$getNextElement(_tmpl$2, true);

    _$effect(() => (_el$6.id = state.last));

    return _el$6;
  })(),
  "After"
];
const singleExpression = inserted;

const singleDynamic = () => inserted();

const firstStatic = [inserted, _$getNextElement(_tmpl$3, true)];
const firstDynamic = [_$memo(() => inserted()), _$getNextElement(_tmpl$3, true)];
const firstComponent = [_$createComponent(Component, {}), _$getNextElement(_tmpl$3, true)];
const lastStatic = [_$getNextElement(_tmpl$3, true), inserted];
const lastDynamic = [_$getNextElement(_tmpl$3, true), _$memo(() => inserted())];
const lastComponent = [_$getNextElement(_tmpl$3, true), _$createComponent(Component, {})];
