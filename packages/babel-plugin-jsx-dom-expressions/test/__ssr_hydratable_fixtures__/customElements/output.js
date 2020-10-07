import { ssr as _$ssr } from "r-dom";
import { escape as _$escape } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";

const template = _$ssr(
  ['<my-element _hk="', '" some-attr="', '" notprop="', '"></my-element>'],
  _$getHydrationKey(),
  _$escape(name, true),
  _$escape(data, true)
);

const template2 = _$ssr(
  ['<my-element _hk="', '" some-attr="', '" notprop="', '"></my-element>'],
  _$getHydrationKey(),
  _$escape(state.name, true),
  _$escape(state.data, true)
);

const template3 = _$ssr(
  ['<my-element _hk="', '"><header slot="head">Title</header></my-element>'],
  _$getHydrationKey()
);

const template4 = _$ssr(['<slot _hk="', '" name="head"></slot>'], _$getHydrationKey());
