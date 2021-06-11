import { template as _$template } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { getNextMatch as _$getNextMatch } from "r-dom";
import { insert as _$insert } from "r-dom";

const _tmpl$ = _$template(
  `<html lang="en"><head><title>🔥 Blazing 🔥</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/styles.css"><script></script></head><body><div></div></body></html>`,
  15
);

const template = (() => {
  const _el$ = _$getNextElement(_tmpl$),
    _el$2 = _$getNextMatch(_el$.firstChild, "head"),
    _el$3 = _el$2.firstChild,
    _el$4 = _el$3.nextSibling,
    _el$5 = _el$4.nextSibling,
    _el$6 = _el$5.nextSibling,
    _el$7 = _el$6.nextSibling,
    _el$8 = _$getNextMatch(_el$2.nextSibling, "body"),
    _el$9 = _el$8.firstChild;

  _el$7.innerHTML = script;

  _$insert(_el$9, test, undefined, Array.prototype.slice.call(_el$9.childNodes, 0));

  return _el$;
})();
