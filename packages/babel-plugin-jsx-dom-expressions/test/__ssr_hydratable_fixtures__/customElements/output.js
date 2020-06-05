import { ssr as _$ssr } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";

const template = _$ssr(
  ['<my-element _hk="', '" some-attr="', '" someprop="', '"></my-element>'],
  _$getHydrationKey(),
  name,
  data
);

const template2 = _$ssr(
  ['<my-element _hk="', '" some-attr="', '" someprop="', '"></my-element>'],
  _$getHydrationKey(),
  () => state.name,
  () => state.data
);

const template3 = _$ssr(
  ['<my-element _hk="', '"><header slot="head">Title</header></my-element>'],
  _$getHydrationKey()
);

const template4 = _$ssr(['<slot _hk="', '" name="head"></slot>'], _$getHydrationKey());
