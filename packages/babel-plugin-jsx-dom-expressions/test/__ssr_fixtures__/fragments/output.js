import { createComponent as _$createComponent } from "r-server";
import { memo as _$memo } from "r-server";
import { ssrAttribute as _$ssrAttribute } from "r-server";
import { escape as _$escape } from "r-server";
import { ssr as _$ssr } from "r-server";
var _tmpl$ = "<div>First</div>",
  _tmpl$2 = "<div>Last</div>",
  _tmpl$3 = "<div></div>",
  _tmpl$4 = "<span>1</span>",
  _tmpl$5 = "<span>2</span>",
  _tmpl$6 = "<span>3</span>";
const multiStatic = [_$ssr(_tmpl$), _$ssr(_tmpl$2)];
const multiExpression = [_$ssr(_tmpl$), inserted, _$ssr(_tmpl$2), "After"];
const multiDynamic = [_$ssr(_tmpl$), _$memo(() => state.inserted), _$ssr(_tmpl$2), "After"];
const singleExpression = inserted;
const singleDynamic = _$memo(inserted);
const firstStatic = [inserted, _$ssr(_tmpl$3)];
const firstDynamic = [_$memo(inserted), _$ssr(_tmpl$3)];
const firstComponent = [_$createComponent(Component, {}), _$ssr(_tmpl$3)];
const lastStatic = [_$ssr(_tmpl$3), inserted];
const lastDynamic = [_$ssr(_tmpl$3), _$memo(inserted)];
const lastComponent = [_$ssr(_tmpl$3), _$createComponent(Component, {})];
const spaces = [_$ssr(_tmpl$4), " ", _$ssr(_tmpl$5), " ", _$ssr(_tmpl$6)];
const multiLineTrailing = [_$ssr(_tmpl$4), _$ssr(_tmpl$5), _$ssr(_tmpl$6)];
