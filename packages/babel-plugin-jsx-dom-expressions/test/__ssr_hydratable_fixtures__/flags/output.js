import { ssr as _$ssr } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { escape as _$escape } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = [
    "<div",
    "><h1>Hello</h1><!--$-->",
    "<!--/--><!--$-->",
    "<!--/--><span>More Text</span></div>"
  ],
  _tmpl$2 = ["<div", "></div>"],
  _tmpl$3 = ["<span", "></span>"];
const template = (() => {
  var _v$ = _$ssrHydrationKey(),
    _v$2 = _$escape(_$createComponent(Component, {})),
    _v$3 = _$ssrRunInScope(() => _$escape(state.interpolation));
  return _$ssr(_tmpl$, _v$, _v$2, _v$3);
})();
const template2 = _$createComponent(Component, {
  get children() {
    var _v$4 = _$ssrHydrationKey();
    return _$ssr(_tmpl$2, _v$4);
  }
});
const template3 = _$createComponent(Component, {
  get children() {
    return [
      (() => {
        var _v$5 = _$ssrHydrationKey();
        return _$ssr(_tmpl$2, _v$5);
      })(),
      (() => {
        var _v$6 = _$ssrHydrationKey();
        return _$ssr(_tmpl$3, _v$6);
      })()
    ];
  }
});
const template4 = (() => {
  var _v$7 = _$ssrHydrationKey();
  return _$ssr(_tmpl$2, _v$7);
})();
