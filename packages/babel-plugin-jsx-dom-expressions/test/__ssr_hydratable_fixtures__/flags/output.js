import { ssr as _$ssr } from "r-server";
import { escape as _$escape } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
const _tmpl$ = [
    "<div",
    "><h1>Hello</h1><!--#-->",
    "<!--/--><!--#-->",
    "<!--/--><span>More Text</span></div>"
  ],
  _tmpl$2 = ["<div", "></div>"],
  _tmpl$3 = ["<span", "></span>"];
const template = _$ssr(
  _tmpl$,
  _$ssrHydrationKey(),
  _$escape(_$createComponent(Component, {})),
  _$escape(state.interpolation)
);
const template2 = _$createComponent(Component, {
  get children() {
    return _$ssr(_tmpl$2, _$ssrHydrationKey());
  }
});
const template3 = _$createComponent(Component, {
  get children() {
    return [_$ssr(_tmpl$2, _$ssrHydrationKey()), _$ssr(_tmpl$3, _$ssrHydrationKey())];
  }
});
const template4 = _$ssr(_tmpl$2, _$ssrHydrationKey());
