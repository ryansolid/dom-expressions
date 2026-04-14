import { template as _$template } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { effect as _$effect } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<svg><g><circle r=5 fill=red></svg>`, 2);
const template = (() => {
  var _el$ = _tmpl$(),
    _el$2 = _el$.firstChild;
  _$effect(
    () => ({
      e: props.cx,
      t: props.cy
    }),
    (
      { e, t },
      _p$ = {
        e: undefined,
        t: undefined
      }
    ) => {
      e !== _p$.e && _$setAttribute(_el$2, "cx", e);
      t !== _p$.t && _$setAttribute(_el$2, "cy", t);
    }
  );
  return _el$;
})();
