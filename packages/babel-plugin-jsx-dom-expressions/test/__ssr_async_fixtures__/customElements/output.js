import { ssrAsync as _$ssrAsync } from "r-dom";
import { escape as _$escape } from "r-dom";

const template = _$ssrAsync(
  ['<my-element some-attr="', '" someprop="', '"></my-element>'],
  _$escape(name, true),
  _$escape(data, true)
);

const template2 = _$ssrAsync(
  ['<my-element some-attr="', '" someprop="', '"></my-element>'],
  () => _$escape(state.name, true),
  () => _$escape(state.data, true)
);

const template3 = _$ssrAsync('<my-element><header slot="head">Title</header></my-element>');

const template4 = _$ssrAsync('<slot name="head"></slot>');
