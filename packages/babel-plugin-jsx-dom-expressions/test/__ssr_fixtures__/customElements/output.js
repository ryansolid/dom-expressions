import { template as _$template } from "r-dom";
import { wrap as _$wrap } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { currentContext as _$currentContext } from "r-dom";

const _tmpl$ = _$template(`<my-element></my-element>`),
  _tmpl$2 = _$template(`<my-element><header slot="head">Title</header></my-element>`),
  _tmpl$3 = _$template(`<slot name="head"></slot>`);

const template = (function() {
  const _el$ = _$getNextElement(_tmpl$, true);

  _el$.setAttribute("some-attr", name);

  _el$.someProp = data;
  _el$._context = _$currentContext();
  return _el$;
})();

const template2 = (function() {
  const _el$2 = _$getNextElement(_tmpl$, true);

  _el$2._context = _$currentContext();

  _$wrap(
    _p$ => {
      const _v$ = state.name,
        _v$2 = state.data;
      _v$ !== _p$._v$ && _el$2.setAttribute("some-attr", (_p$._v$ = _v$));
      _v$2 !== _p$._v$2 && (_el$2.someProp = _p$._v$2 = _v$2);
      return _p$;
    },
    {
      _v$: undefined,
      _v$2: undefined
    }
  );

  return _el$2;
})();

const template3 = (function() {
  const _el$3 = _$getNextElement(_tmpl$2, true);

  _el$3._context = _$currentContext();
  return _el$3;
})();

const template4 = (() => {
  const _el$4 = _$getNextElement(_tmpl$3, true);

  _el$4._context = _$currentContext();
  return _el$4;
})();
