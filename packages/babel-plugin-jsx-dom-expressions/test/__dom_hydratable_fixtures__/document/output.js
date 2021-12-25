import { getNextElement as _$getNextElement } from "r-dom";
import { getNextMatch as _$getNextMatch } from "r-dom";
import { getNextMarker as _$getNextMarker } from "r-dom";
import { insert as _$insert } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";

const template = (() => {
  const _el$ = _$getNextElement(),
    _el$9 = _$getNextMatch(_el$.firstChild, "body"),
    _el$10 = _el$9.firstChild,
    _el$12 = _el$10.nextSibling,
    [_el$13, _co$2] = _$getNextMarker(_el$12.nextSibling),
    _el$11 = _el$13.nextSibling;

  _$insert(_el$9, _$createComponent(App, {}), _el$13, _co$2);

  return _el$;
})();
