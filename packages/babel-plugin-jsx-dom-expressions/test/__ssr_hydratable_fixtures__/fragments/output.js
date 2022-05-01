import { createComponent as _$createComponent } from "r-server";
import { ssrAttribute as _$ssrAttribute } from "r-server";
import { escape as _$escape } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
const _tmpl$ = ["<div", ">First</div>"],
  _tmpl$2 = ["<div", ">Last</div>"],
  _tmpl$3 = ["<div", "></div>"],
  _tmpl$4 = ["<span", ">1</span>"],
  _tmpl$5 = ["<span", ">2</span>"],
  _tmpl$6 = ["<span", ">3</span>"];
const multiStatic = [_$ssr(_tmpl$, _$ssrHydrationKey()), _$ssr(_tmpl$2, _$ssrHydrationKey())];
const multiExpression = [
  _$ssr(_tmpl$, _$ssrHydrationKey()),
  inserted,
  _$ssr(_tmpl$2, _$ssrHydrationKey()),
  "After"
];
const multiDynamic = [
  _$ssr(_tmpl$, _$ssrHydrationKey() + _$ssrAttribute("id", _$escape(state.first, true), false)),
  state.inserted,
  _$ssr(_tmpl$2, _$ssrHydrationKey() + _$ssrAttribute("id", _$escape(state.last, true), false)),
  "After"
];
const singleExpression = inserted;
const singleDynamic = inserted();
const firstStatic = [inserted, _$ssr(_tmpl$3, _$ssrHydrationKey())];
const firstDynamic = [inserted(), _$ssr(_tmpl$3, _$ssrHydrationKey())];
const firstComponent = [_$createComponent(Component, {}), _$ssr(_tmpl$3, _$ssrHydrationKey())];
const lastStatic = [_$ssr(_tmpl$3, _$ssrHydrationKey()), inserted];
const lastDynamic = [_$ssr(_tmpl$3, _$ssrHydrationKey()), inserted()];
const lastComponent = [_$ssr(_tmpl$3, _$ssrHydrationKey()), _$createComponent(Component, {})];
const spaces = [
  _$ssr(_tmpl$4, _$ssrHydrationKey()),
  " ",
  _$ssr(_tmpl$5, _$ssrHydrationKey()),
  " ",
  _$ssr(_tmpl$6, _$ssrHydrationKey())
];
const multiLineTrailing = [
  _$ssr(_tmpl$4, _$ssrHydrationKey()),
  _$ssr(_tmpl$5, _$ssrHydrationKey()),
  _$ssr(_tmpl$6, _$ssrHydrationKey())
];
