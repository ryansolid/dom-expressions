import { ssr as _$ssr } from "r-server";
import { escape as _$escape } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = [
    "<html",
    '><head><title>\uD83D\uDD25 Blazing \uD83D\uDD25</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/styles.css"><!--$-->',
    "<!--/--></head><body><header><h1>Welcome to the Jungle</h1></header><!--$-->",
    "<!--/--><footer>The Bottom</footer></body></html>"
  ],
  _tmpl$2 = [
    "<head",
    '><title>\uD83D\uDD25 Blazing \uD83D\uDD25</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/styles.css"><!--$-->',
    "<!--/--></head>"
  ],
  _tmpl$3 = [
    "<body",
    "><header><h1>Welcome to the Jungle</h1></header><!--$-->",
    "<!--/--><footer>The Bottom</footer></body>"
  ],
  _tmpl$4 = ["<html", "><!--$-->", "<!--/--><!--$-->", "<!--/--></html>"];
const template = (() => {
  var _v$ = _$ssrHydrationKey(),
    _v$2 = _$escape(_$createComponent(Assets, {})),
    _v$3 = _$escape(_$createComponent(App, {}));
  return _$ssr(_tmpl$, _v$, _v$2, _v$3);
})();
const templateHead = (() => {
  var _v$4 = _$ssrHydrationKey(),
    _v$5 = _$escape(_$createComponent(Assets, {}));
  return _$ssr(_tmpl$2, _v$4, _v$5);
})();
const templateBody = (() => {
  var _v$6 = _$ssrHydrationKey(),
    _v$7 = _$escape(_$createComponent(App, {}));
  return _$ssr(_tmpl$3, _v$6, _v$7);
})();
const templateEmptied = (() => {
  var _v$8 = _$ssrHydrationKey(),
    _v$9 = _$escape(_$createComponent(Head, {})),
    _v$10 = _$escape(_$createComponent(Body, {}));
  return _$ssr(_tmpl$4, _v$8, _v$9, _v$10);
})();
