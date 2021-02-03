import { createComponent as _$createComponent } from "r-server";
import { escape as _$escape } from "r-server";
import { ssr as _$ssr } from "r-server";
import { getHydrationKey as _$getHydrationKey } from "r-server";
const _tmpl$ = ['<div data-hk="', '">First</div>'],
  _tmpl$2 = ['<div data-hk="', '">Last</div>'],
  _tmpl$3 = ['<div data-hk="', '" id="', '">First</div>'],
  _tmpl$4 = ['<div data-hk="', '" id="', '">Last</div>'],
  _tmpl$5 = ['<div data-hk="', '"></div>'];
const multiStatic = [_$ssr(_tmpl$, _$getHydrationKey()), _$ssr(_tmpl$2, _$getHydrationKey())];
const multiExpression = [
  _$ssr(_tmpl$, _$getHydrationKey()),
  inserted,
  _$ssr(_tmpl$2, _$getHydrationKey()),
  "After"
];
const multiDynamic = [
  _$ssr(_tmpl$3, _$getHydrationKey(), _$escape(state.first, true)),
  state.inserted,
  _$ssr(_tmpl$4, _$getHydrationKey(), _$escape(state.last, true)),
  "After"
];
const singleExpression = inserted;
const singleDynamic = inserted();
const firstStatic = [inserted, _$ssr(_tmpl$5, _$getHydrationKey())];
const firstDynamic = [inserted(), _$ssr(_tmpl$5, _$getHydrationKey())];
const firstComponent = [_$createComponent(Component, {}), _$ssr(_tmpl$5, _$getHydrationKey())];
const lastStatic = [_$ssr(_tmpl$5, _$getHydrationKey()), inserted];
const lastDynamic = [_$ssr(_tmpl$5, _$getHydrationKey()), inserted()];
const lastComponent = [_$ssr(_tmpl$5, _$getHydrationKey()), _$createComponent(Component, {})];
