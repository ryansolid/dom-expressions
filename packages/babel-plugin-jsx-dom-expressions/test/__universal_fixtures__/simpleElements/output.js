import { createTextNode as _$createTextNode } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { setProp as _$setProp } from "r-custom";
import { createElement as _$createElement } from "r-custom";
const template = (() => {
  var _el$ = _$createElement("div"),
    _el$2 = _$createElement("style"),
    _el$4 = _$createElement("h1"),
    _el$6 = _$createElement("label"),
    _el$8 = _$createElement("input");
  _$insertNode(_el$, _el$2);
  _$insertNode(_el$, _el$4);
  _$insertNode(_el$, _el$6);
  _$insertNode(_el$, _el$8);
  _$setProp(_el$, "id", "main");
  _$insertNode(_el$2, _$createTextNode(`div \{ color: red; }`));
  _$insertNode(_el$4, _$createTextNode(`Welcome`));
  _$insertNode(_el$6, _$createTextNode(`Edit:`));
  _$setProp(_el$6, "for", "entry");
  _$setProp(_el$8, "id", "entry");
  _$setProp(_el$8, "type", "text");
  return _el$;
})();
const template2 = (() => {
  var _el$9 = _$createElement("div"),
    _el$0 = _$createElement("span"),
    _el$1 = _$createElement("a"),
    _el$10 = _$createElement("span");
  _$insertNode(_el$9, _el$0);
  _$insertNode(_el$9, _el$10);
  _$insertNode(_el$0, _el$1);
  return _el$9;
})();
const template3 = (() => {
  var _el$11 = _$createElement("div"),
    _el$12 = _$createElement("div"),
    _el$13 = _$createElement("table"),
    _el$14 = _$createElement("tbody"),
    _el$15 = _$createElement("div");
  _$insertNode(_el$11, _el$12);
  _$insertNode(_el$11, _el$15);
  _$insertNode(_el$12, _el$13);
  _$insertNode(_el$13, _el$14);
  return _el$11;
})();
const template4 = (() => {
  var _el$16 = _$createElement("div"),
    _el$17 = _$createElement("div"),
    _el$18 = _$createElement("footer"),
    _el$19 = _$createElement("div"),
    _el$20 = _$createElement("div"),
    _el$21 = _$createElement("button"),
    _el$22 = _$createElement("span");
  _$insertNode(_el$16, _el$17);
  _$insertNode(_el$16, _el$20);
  _$insertNode(_el$17, _el$18);
  _$insertNode(_el$18, _el$19);
  _$insertNode(_el$20, _el$21);
  _$insertNode(_el$21, _el$22);
  _$insertNode(_el$22, _$createTextNode(`0`));
  return _el$16;
})();
