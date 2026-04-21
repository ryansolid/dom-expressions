import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrClassName as _$ssrClassName } from "r-server";
var _tmpl$ = ['<div class="', '">static static</div>'],
  _tmpl$2 = ['<div class="', '">static + dynamic</div>'],
  _tmpl$3 = ['<div class="', '">two dynamic</div>'],
  _tmpl$4 = ['<div class="', '">string + object</div>'],
  _tmpl$5 = ['<div class="', '">three statics</div>'];
// Multiple `class=` attributes on a single element should be combined
// by the SSR compiler into a single class attribute with a joined value.
const dynamicClass = () => "dyn";
const flag = true;
const t1 = _$ssr(_tmpl$, _$ssrClassName(`a b`));
const t2 = (() => {
  var _v$ = _$ssrRunInScope([() => _$ssrClassName(`a ${_$ssrClassName(dynamicClass()) || ""}`)]);
  return _$ssr(_tmpl$2, _v$[0]);
})();
const t3 = (() => {
  var _v$2 = _$ssrRunInScope([
    () => _$ssrClassName(`${_$ssrClassName(dynamicClass()) || ""} ${_$ssrClassName("on") || ""}`)
  ]);
  return _$ssr(_tmpl$3, _v$2[0]);
})();
const t4 = _$ssr(_tmpl$4, _$ssrClassName(`base active `));
const t5 = _$ssr(_tmpl$5, _$ssrClassName(`a b c`));
