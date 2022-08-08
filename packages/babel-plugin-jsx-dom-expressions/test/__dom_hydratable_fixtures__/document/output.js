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

const templateHead = (() => {
  const _el$14 = _$getNextElement(),
    _el$15 = _el$14.firstChild,
    _el$16 = _el$15.nextSibling,
    _el$17 = _el$16.nextSibling,
    _el$18 = _el$17.nextSibling,
    _el$19 = _el$18.nextSibling,
    [_el$20, _co$3] = _$getNextMarker(_el$19.nextSibling);

  _$insert(_el$14, _$createComponent(Assets, {}), _el$20, _co$3);

  return _el$14;
})();

const templateBody = (() => {
  const _el$21 = _$getNextElement(),
    _el$22 = _el$21.firstChild,
    _el$24 = _el$22.nextSibling,
    [_el$25, _co$4] = _$getNextMarker(_el$24.nextSibling),
    _el$23 = _el$25.nextSibling;

  _$insert(_el$21, _$createComponent(App, {}), _el$25, _co$4);

  return _el$21;
})();
