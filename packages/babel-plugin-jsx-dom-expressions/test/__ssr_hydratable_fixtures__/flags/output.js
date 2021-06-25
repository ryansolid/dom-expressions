import { ssr as _$ssr } from "r-server";
import { escape as _$escape } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
const _tmpl$ = [
  "<div",
  "><h1>Hello</h1><!--#-->",
  "<!--/--><!--#-->",
  "<!--/--><span>More Text</span></div>"
];

const template = _$ssr(
  _tmpl$,
  _$ssrHydrationKey(),
  _$escape(_$createComponent(Component, {})),
  _$escape(state.interpolation)
);
