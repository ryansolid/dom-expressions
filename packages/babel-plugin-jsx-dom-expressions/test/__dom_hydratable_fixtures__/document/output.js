import { getNextElement as _$getNextElement } from "r-dom";
import { getNextMatch as _$getNextMatch } from "r-dom";
import { getNextMarker as _$getNextMarker } from "r-dom";
import { insert as _$insert } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";

const template = (() => {
  const _el$ = _$getNextElement(),
    _el$2 = _$getNextMatch(_el$.firstChild, "head"),
    _el$3 = _el$2.firstChild,
    _el$4 = _el$3.nextSibling,
    _el$5 = _el$4.nextSibling,
    _el$6 = _el$5.nextSibling,
    _el$7 = _el$6.nextSibling,
    [_el$8, _co$] = _$getNextMarker(_el$7.nextSibling),
    _el$9 = _$getNextMatch(_el$2.nextSibling, "body"),
    _el$10 = _el$9.firstChild,
    _el$12 = _el$10.nextSibling,
    [_el$13, _co$2] = _$getNextMarker(_el$12.nextSibling),
    _el$11 = _el$13.nextSibling;

  _$insert(_el$2, _$createComponent(Assets, {}), _el$8, _co$);

  _$insert(_el$9, _$createComponent(App, {}), _el$13, _co$2);

  return _el$;
})();
