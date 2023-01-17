import { ssr as _$ssr } from "r-server";
import { NoHydration as _$NoHydration } from "r-server";
import { escape as _$escape } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
const _tmpl$ = [
    '<head><title>\uD83D\uDD25 Blazing \uD83D\uDD25</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/styles.css"><script>',
    "</script>",
    "</head>"
  ],
  _tmpl$2 = [
    "<html",
    ">",
    "<body><header><h1>Welcome to the Jungle</h1></header><!--#-->",
    "<!--/--><footer>The Bottom</footer></body></html>"
  ],
  _tmpl$3 = [
    '<head><title>\uD83D\uDD25 Blazing \uD83D\uDD25</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/styles.css"><!--#-->',
    "<!--/--></head>"
  ],
  _tmpl$4 = [
    "<body",
    "><header><h1>Welcome to the Jungle</h1></header><!--#-->",
    "<!--/--><footer>The Bottom</footer></body>"
  ],
  _tmpl$5 = ["<html", "><!--#-->", "<!--/--><!--#-->", "<!--/--></html>"];
const template = _$ssr(
  _tmpl$2,
  _$ssrHydrationKey(),
  _$createComponent(_$NoHydration, {
    get children() {
      return _$ssr(_tmpl$, `var data = [${d}]`, _$escape(_$createComponent(Assets, {})));
    }
  }),
  _$escape(_$createComponent(App, {}))
);
const templateHead = _$createComponent(_$NoHydration, {
  get children() {
    return _$ssr(_tmpl$3, _$escape(_$createComponent(Assets, {})));
  }
});
const templateBody = _$ssr(_tmpl$4, _$ssrHydrationKey(), _$escape(_$createComponent(App, {})));
const templateEmptied = _$ssr(
  _tmpl$5,
  _$ssrHydrationKey(),
  _$escape(_$createComponent(Head, {})),
  _$escape(_$createComponent(Body, {}))
);
