import { ssr as _$ssr } from "r-server";
import { escape as _$escape } from "r-server";
const _tmpl$ = ['<my-element some-attr="', '" notprop="', '" my-attr="', '"></my-element>'],
  _tmpl$2 = '<my-element><header slot="head">Title</header></my-element>',
  _tmpl$3 = '<slot name="head"></slot>';

const template = _$ssr(_tmpl$, _$escape(name, true), _$escape(data, true), _$escape(data, true));

const template2 = _$ssr(
  _tmpl$,
  _$escape(state.name, true),
  _$escape(state.data, true),
  _$escape(state.data, true)
);

const template3 = _$ssr(_tmpl$2);

const template4 = _$ssr(_tmpl$3);
