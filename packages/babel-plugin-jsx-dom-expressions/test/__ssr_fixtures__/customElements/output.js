import { ssr as _$ssr } from "r-dom";

const template = _$ssr(['<my-element some-attr="', '" someprop="', '"></my-element>'], name, data);

const template2 = _$ssr(
  ['<my-element some-attr="', '" someprop="', '"></my-element>'],
  () => state.name,
  () => state.data
);

const template3 = '<my-element><header slot="head">Title</header></my-element>';
const template4 = '<slot name="head"></slot>';
