import { createComponent as _$createComponent } from "r-dom";
import { escape as _$escape } from "r-dom";
import { ssrAsync as _$ssrAsync } from "r-dom";
const multiStatic = [_$ssrAsync("<div>First</div>"), _$ssrAsync("<div>Last</div>")];
const multiExpression = [
  _$ssrAsync("<div>First</div>"),
  inserted,
  _$ssrAsync("<div>Last</div>"),
  "After"
];
const multiDynamic = [
  _$ssrAsync(['<div id="', '">First</div>'], () => _$escape(state.first, true)),
  () => state.inserted,
  _$ssrAsync(['<div id="', '">Last</div>'], () => _$escape(state.last, true)),
  "After"
];
const singleExpression = inserted;

const singleDynamic = () => inserted();

const firstStatic = [inserted, _$ssrAsync("<div></div>")];
const firstDynamic = [() => inserted(), _$ssrAsync("<div></div>")];
const firstComponent = [_$createComponent(Component, {}), _$ssrAsync("<div></div>")];
const lastStatic = [_$ssrAsync("<div></div>"), inserted];
const lastDynamic = [_$ssrAsync("<div></div>"), () => inserted()];
const lastComponent = [_$ssrAsync("<div></div>"), _$createComponent(Component, {})];
