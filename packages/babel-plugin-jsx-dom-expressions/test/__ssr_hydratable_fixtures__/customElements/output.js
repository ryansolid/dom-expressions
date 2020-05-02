import { ssr as _$ssr } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";
const template = _$ssr`<my-element _hk="${_$getHydrationKey()}" some-attr="${name}" someprop="${data}"></my-element>`;
const template2 = _$ssr`<my-element _hk="${_$getHydrationKey()}" some-attr="${() =>
  state.name}" someprop="${() => state.data}"></my-element>`;
const template3 = _$ssr`<my-element _hk="${_$getHydrationKey()}"><header slot="head">Title</header></my-element>`;
const template4 = _$ssr`<slot _hk="${_$getHydrationKey()}" name="head"></slot>`;
