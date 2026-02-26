import { ssr as _$ssr } from "r-server";
import { ssrAttribute as _$ssrAttribute } from "r-server";
import { escape as _$escape } from "r-server";
var _tmpl$ = ["<my-element", "", "", "></my-element>"],
  _tmpl$2 = "<my-element></my-element>",
  _tmpl$3 = '<my-element><header slot="head">Title</header></my-element>',
  _tmpl$4 = '<slot name="head"></slot>',
  _tmpl$5 = '<a is="my-element"></a>';
const template = _$ssr(
  _tmpl$,
  _$ssrAttribute("some-attr", _$escape(name, true)),
  _$ssrAttribute("notProp", _$escape(data, true)),
  _$ssrAttribute("my-attr", _$escape(data, true))
);
const template2 = _$ssr(_tmpl$2);
const template3 = _$ssr(_tmpl$3);
const template4 = _$ssr(_tmpl$4);
const template5 = _$ssr(_tmpl$5);
