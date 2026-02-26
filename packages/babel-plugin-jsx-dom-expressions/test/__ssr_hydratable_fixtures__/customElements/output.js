import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrAttribute as _$ssrAttribute } from "r-server";
import { escape as _$escape } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = ["<my-element", "", "", "", "></my-element>"],
  _tmpl$2 = ["<my-element", '><header slot="head">Title</header></my-element>'],
  _tmpl$3 = ["<slot", ' name="head"></slot>'],
  _tmpl$4 = ["<a", ' is="my-element"></a>'];
const template = (() => {
  var _v$ = _$ssrHydrationKey();
  return _$ssr(
    _tmpl$,
    _v$,
    _$ssrAttribute("some-attr", _$escape(name, true)),
    _$ssrAttribute("notProp", _$escape(data, true)),
    _$ssrAttribute("my-attr", _$escape(data, true))
  );
})();
const template2 = (() => {
  var _v$2 = _$ssrHydrationKey(),
    _v$3 = _$ssrRunInScope([
      () => _$ssrAttribute("some-attr", _$escape(state.name, true)),
      () => _$ssrAttribute("notProp", _$escape(state.data, true)),
      () => _$ssrAttribute("my-attr", _$escape(state.data, true))
    ]);
  return _$ssr(_tmpl$, _v$2, _v$3[0], _v$3[1], _v$3[2]);
})();
const template3 = (() => {
  var _v$4 = _$ssrHydrationKey();
  return _$ssr(_tmpl$2, _v$4);
})();
const template4 = (() => {
  var _v$5 = _$ssrHydrationKey();
  return _$ssr(_tmpl$3, _v$5);
})();
const template5 = (() => {
  var _v$6 = _$ssrHydrationKey();
  return _$ssr(_tmpl$4, _v$6);
})();
