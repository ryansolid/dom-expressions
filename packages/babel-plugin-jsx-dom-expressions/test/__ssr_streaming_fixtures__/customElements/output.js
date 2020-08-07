import { ssrStream as _$ssrStream } from "r-dom";
import { escape as _$escape } from "r-dom";

const template = _$ssrStream(
  ['<my-element some-attr="', '" someprop="', '"></my-element>'],
  _$escape(name, true),
  _$escape(data, true)
);

const template2 = _$ssrStream(
  ['<my-element some-attr="', '" someprop="', '"></my-element>'],
  _$escape(state.name, true),
  _$escape(state.data, true)
);

const template3 = _$ssrStream('<my-element><header slot="head">Title</header></my-element>');

const template4 = _$ssrStream('<slot name="head"></slot>');
