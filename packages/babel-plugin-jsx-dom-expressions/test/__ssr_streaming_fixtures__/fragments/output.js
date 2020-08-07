import { createComponent as _$createComponent } from "r-dom";
import { escape as _$escape } from "r-dom";
import { ssrStream as _$ssrStream } from "r-dom";
const multiStatic = [_$ssrStream("<div>First</div>"), _$ssrStream("<div>Last</div>")];
const multiExpression = [
  _$ssrStream("<div>First</div>"),
  inserted,
  _$ssrStream("<div>Last</div>"),
  "After"
];
const multiDynamic = [
  _$ssrStream(['<div id="', '">First</div>'], _$escape(state.first, true)),
  state.inserted,
  _$ssrStream(['<div id="', '">Last</div>'], _$escape(state.last, true)),
  "After"
];
const singleExpression = inserted;
const singleDynamic = inserted();
const firstStatic = [inserted, _$ssrStream("<div></div>")];
const firstDynamic = [inserted(), _$ssrStream("<div></div>")];
const firstComponent = [_$createComponent(Component, {}), _$ssrStream("<div></div>")];
const lastStatic = [_$ssrStream("<div></div>"), inserted];
const lastDynamic = [_$ssrStream("<div></div>"), inserted()];
const lastComponent = [_$ssrStream("<div></div>"), _$createComponent(Component, {})];
