import { getNextElement as _$getNextElement } from "r-dom";
import { getNextMatch as _$getNextMatch } from "r-dom";
import { NoHydration as _$NoHydration } from "r-dom";
import { getNextMarker as _$getNextMarker } from "r-dom";
import { insert as _$insert } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
const template = (() => {
  var _el$ = _$getNextElement(),
    _el$9 = _$getNextMatch(_el$.firstChild, "body"),
    _el$0 = _el$9.firstChild,
    _el$10 = _el$0.nextSibling,
    [_el$11, _co$2] = _$getNextMarker(_el$10.nextSibling),
    _el$1 = _el$11.nextSibling;
  _$createComponent(_$NoHydration, {});
  _$insert(_el$9, _$createComponent(App, {}), _el$11, _co$2);
  return _el$;
})();
const templateHead = _$createComponent(_$NoHydration, {});
const templateBody = (() => {
  var _el$12 = _$getNextElement(),
    _el$13 = _el$12.firstChild,
    _el$15 = _el$13.nextSibling,
    [_el$16, _co$3] = _$getNextMarker(_el$15.nextSibling),
    _el$14 = _el$16.nextSibling;
  _$insert(_el$12, _$createComponent(App, {}), _el$16, _co$3);
  return _el$12;
})();
const templateEmptied = (() => {
  var _el$17 = _$getNextElement(),
    _el$18 = _el$17.firstChild,
    [_el$19, _co$4] = _$getNextMarker(_el$18.nextSibling),
    _el$20 = _el$19.nextSibling,
    [_el$21, _co$5] = _$getNextMarker(_el$20.nextSibling);
  _$insert(_el$17, _$createComponent(Head, {}), _el$19, _co$4);
  _$insert(_el$17, _$createComponent(Body, {}), _el$21, _co$5);
  return _el$17;
})();
