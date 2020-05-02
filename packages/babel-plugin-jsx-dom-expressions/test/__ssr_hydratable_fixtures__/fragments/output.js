import { createComponent as _$createComponent } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";
const multiStatic = [
  _$ssr`<div _hk="${_$getHydrationKey()}">First</div>`,
  _$ssr`<div _hk="${_$getHydrationKey()}">Last</div>`
];
const multiExpression = [
  _$ssr`<div _hk="${_$getHydrationKey()}">First</div>`,
  inserted,
  _$ssr`<div _hk="${_$getHydrationKey()}">Last</div>`,
  "After"
];
const multiDynamic = [
  _$ssr`<div _hk="${_$getHydrationKey()}" id="${() => state.first}">First</div>`,
  () => state.inserted,
  _$ssr`<div _hk="${_$getHydrationKey()}" id="${() => state.last}">Last</div>`,
  "After"
];
const singleExpression = inserted;

const singleDynamic = () => inserted();

const firstStatic = [inserted, _$ssr`<div _hk="${_$getHydrationKey()}"></div>`];
const firstDynamic = [() => inserted(), _$ssr`<div _hk="${_$getHydrationKey()}"></div>`];
const firstComponent = [
  _$createComponent(Component, {}),
  _$ssr`<div _hk="${_$getHydrationKey()}"></div>`
];
const lastStatic = [_$ssr`<div _hk="${_$getHydrationKey()}"></div>`, inserted];
const lastDynamic = [_$ssr`<div _hk="${_$getHydrationKey()}"></div>`, () => inserted()];
const lastComponent = [
  _$ssr`<div _hk="${_$getHydrationKey()}"></div>`,
  _$createComponent(Component, {})
];
