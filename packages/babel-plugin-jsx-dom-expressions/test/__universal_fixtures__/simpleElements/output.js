import { createTextNode as _$createTextNode } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { setProp as _$setProp } from "r-custom";
import { createElement as _$createElement } from "r-custom";

const template = (() => {
  const _el$ = _$createElement("div"),
    _el$2 = _$createElement("style"),
    _el$4 = _$createElement("h1"),
    _el$6 = _$createElement("label"),
    _el$8 = _$createElement("input");

  _$insertNode(_el$, _el$2);

  _$insertNode(_el$, _el$4);

  _$insertNode(_el$, _el$6);

  _$insertNode(_el$, _el$8);

  _$setProp(_el$, "id", "main");

  _$insertNode(_el$2, _$createTextNode("div { color: red; }"));

  _$insertNode(_el$4, _$createTextNode("Welcome"));

  _$insertNode(_el$6, _$createTextNode("Edit:"));

  _$setProp(_el$6, "for", "entry");

  _$setProp(_el$8, "id", "entry");

  _$setProp(_el$8, "type", "text");

  return _el$;
})();
