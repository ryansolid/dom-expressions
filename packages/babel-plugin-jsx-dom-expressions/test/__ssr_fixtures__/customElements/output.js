import { ssr as _$ssr } from "r-dom";
const template = _$ssr`<my-element some-attr="${name}" someprop="${data}"></my-element>`;
const template2 = _$ssr`<my-element some-attr="${() => state.name}" someprop="${() =>
  state.data}"></my-element>`;
const template3 = '<my-element><header slot="head">Title</header></my-element>';
const template4 = '<slot name="head"></slot>';
