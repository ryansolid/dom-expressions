import { template as _$template } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";

const _tmpl$ = _$template(
  `<div id="main"><style>div { color: red; }</style><h1>Welcome</h1><label for="entry">Edit:</label><input id="entry" type="text"></div>`
);

const template = (function() {
  const _el$ = _$getNextElement(_tmpl$, true),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.firstChild;

  return _el$;
})();
