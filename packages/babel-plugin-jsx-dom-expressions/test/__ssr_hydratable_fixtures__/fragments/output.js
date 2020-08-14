import { createComponent as _$createComponent } from "r-dom";
import { escape as _$escape } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";
const multiStatic = [
  _$ssr(['<div _hk="', '">First</div>'], _$getHydrationKey()),
  _$ssr(['<div _hk="', '">Last</div>'], _$getHydrationKey())
];
const multiExpression = [
  _$ssr(['<div _hk="', '">First</div>'], _$getHydrationKey()),
  inserted,
  _$ssr(['<div _hk="', '">Last</div>'], _$getHydrationKey()),
  "After"
];
const multiDynamic = [
  _$ssr(
    ['<div _hk="', '" id="', '">First</div>'],
    _$getHydrationKey(),
    _$escape(state.first, true)
  ),
  state.inserted,
  _$ssr(['<div _hk="', '" id="', '">Last</div>'], _$getHydrationKey(), _$escape(state.last, true)),
  "After"
];
const singleExpression = inserted;
const singleDynamic = inserted();
const firstStatic = [inserted, _$ssr(['<div _hk="', '"></div>'], _$getHydrationKey())];
const firstDynamic = [inserted(), _$ssr(['<div _hk="', '"></div>'], _$getHydrationKey())];
const firstComponent = [
  _$createComponent(Component, {}),
  _$ssr(['<div _hk="', '"></div>'], _$getHydrationKey())
];
const lastStatic = [_$ssr(['<div _hk="', '"></div>'], _$getHydrationKey()), inserted];
const lastDynamic = [_$ssr(['<div _hk="', '"></div>'], _$getHydrationKey()), inserted()];
const lastComponent = [
  _$ssr(['<div _hk="', '"></div>'], _$getHydrationKey()),
  _$createComponent(Component, {})
];
