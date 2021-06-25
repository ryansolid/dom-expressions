import { ssr as _$ssr } from "r-server";
import { escape as _$escape } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
const _tmpl$ = [
  "<html",
  '><head><title>\uD83D\uDD25 Blazing \uD83D\uDD25</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/styles.css"><!--#-->',
  "<!--/--></head><body><header><h1>Welcome to the Jungle</h1></header><!--#-->",
  "<!--/--><footer>The Bottom</footer></body></html>"
];

const template = _$ssr(
  _tmpl$,
  _$ssrHydrationKey(),
  _$escape(_$createComponent(Assets, {})),
  _$escape(_$createComponent(App, {}))
);
