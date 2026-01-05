import { createComponent as _$createComponent, insert as _$insert, getNextMarker as _$getNextMarker, getNextMatch as _$getNextMatch, getNextElement as _$getNextElement } from "r-dom";
const template = (() => {
  var _el$ = _$getNextElement(),
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
const templateHead = (() => {
  var _el$14 = _$getNextElement(),
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
  var _el$21 = _$getNextElement(),
    _el$22 = _el$21.firstChild,
    _el$24 = _el$22.nextSibling,
    [_el$25, _co$4] = _$getNextMarker(_el$24.nextSibling),
    _el$23 = _el$25.nextSibling;
  _$insert(_el$21, _$createComponent(App, {}), _el$25, _co$4);
  return _el$21;
})();
const templateEmptied = (() => {
  var _el$26 = _$getNextElement(),
    _el$27 = _el$26.firstChild,
    [_el$28, _co$5] = _$getNextMarker(_el$27.nextSibling),
    _el$29 = _el$28.nextSibling,
    [_el$30, _co$6] = _$getNextMarker(_el$29.nextSibling);
  _$insert(_el$26, _$createComponent(Head, {}), _el$28, _co$5);
  _$insert(_el$26, _$createComponent(Body, {}), _el$30, _co$6);
  return _el$26;
})();
