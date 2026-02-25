import { ssr as _$ssr } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = [
    "<html",
    '><head><title>Blazing</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/styles.css"></head><body><header><h1>Welcome to the Jungle</h1></header><footer>The Bottom</footer></body></html>'
  ],
  _tmpl$2 = [
    "<head",
    '><title>Blazing</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/styles.css"></head>'
  ];
const template = (() => {
  var _v$ = _$ssrHydrationKey();
  return _$ssr(_tmpl$, _v$);
})();
const templateHead = (() => {
  var _v$2 = _$ssrHydrationKey();
  return _$ssr(_tmpl$2, _v$2);
})();
