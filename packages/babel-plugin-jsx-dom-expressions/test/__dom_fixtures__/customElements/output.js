import { template as _$template } from "r-dom";
import { effect as _$effect } from "r-dom";
import { currentContext as _$currentContext } from "r-dom";

const _tmpl$ = _$template(`<my-element></my-element>`, 2),
  _tmpl$2 = _$template(`<my-element><header slot="head">Title</header></my-element>`, 4),
  _tmpl$3 = _$template(`<slot name="head"></slot>`, 2);

const template = (() => {
  const _el$ = _tmpl$.cloneNode(true);

  _el$.someAttr = name;
  _el$.notprop = data;
  _el$._context = _$currentContext();
  return _el$;
})();

const template2 = (() => {
  const _el$2 = _tmpl$.cloneNode(true);

  _el$2._context = _$currentContext();

  _$effect(
    _p$ => {
      const _v$ = state.name,
        _v$2 = state.data;
      _v$ !== _p$._v$ && (_el$2.someAttr = _p$._v$ = _v$);
      _v$2 !== _p$._v$2 && (_el$2.notprop = _p$._v$2 = _v$2);
      return _p$;
    },
    {
      _v$: undefined,
      _v$2: undefined
    }
  );

  return _el$2;
})();

const template3 = (() => {
  const _el$3 = _tmpl$2.cloneNode(true);

  _el$3._context = _$currentContext();
  return _el$3;
})();

const template4 = (() => {
  const _el$4 = _tmpl$3.cloneNode(true);

  _el$4._context = _$currentContext();
  return _el$4;
})();
