import { mergeProps as _$mergeProps } from "r-server";
import { memo as _$memo } from "r-server";
import { ssrElement as _$ssrElement } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { escape as _$escape } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { ssr as _$ssr } from "r-server";
var _tmpl$ = "<div></div>",
  _tmpl$2 = ["<module>", "</module>"],
  _tmpl$3 = "<module>Hello</module>",
  _tmpl$4 = ["<module>Hi ", "</module>"],
  _tmpl$5 = "<div>Test 1</div>",
  _tmpl$6 = ["<div>", "</div>"];
const children = _$ssr(_tmpl$);
const dynamic = {
  children
};
const template = _$createComponent(Module, {
  children: children
});
const template2 = (() => {
  var _v$ = _$escape(children);
  return _$ssr(_tmpl$2, _v$);
})();
const template3 = _$ssr(_tmpl$3);
const template4 = (() => {
  var _v$2 = _$escape(_$createComponent(Hello, {}));
  return _$ssr(_tmpl$2, _v$2);
})();
const template5 = (() => {
  var _v$3 = _$ssrRunInScope(() => _$escape(dynamic.children));
  return _$ssr(_tmpl$2, _v$3);
})();
const template6 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template7 = _$ssrElement("module", dynamic, undefined, false);
const template8 = _$ssrElement("module", dynamic, "Hello", false);
const template9 = _$ssrElement(
  "module",
  dynamic,
  _$memo(() => _$escape(dynamic.children)),
  false
);
const template10 = _$createComponent(
  Module,
  _$mergeProps(dynamic, {
    children: "Hello"
  })
);
const template11 = (() => {
  var _v$4 = _$escape(state.children);
  return _$ssr(_tmpl$2, _v$4);
})();
const template12 = _$createComponent(Module, {
  children: state.children
});
const template13 = (() => {
  var _v$5 = _$escape(children);
  return _$ssr(_tmpl$2, _v$5);
})();
const template14 = _$createComponent(Module, {
  children: children
});
const template15 = (() => {
  var _v$6 = _$ssrRunInScope(() => _$escape(dynamic.children));
  return _$ssr(_tmpl$2, _v$6);
})();
const template16 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template18 = (() => {
  var _v$7 = _$escape(children);
  return _$ssr(_tmpl$4, _v$7);
})();
const template19 = _$createComponent(Module, {
  get children() {
    return ["Hi ", children];
  }
});
const template20 = (() => {
  var _v$8 = _$ssrRunInScope(() => _$escape(children()));
  return _$ssr(_tmpl$2, _v$8);
})();
const template21 = _$createComponent(Module, {
  get children() {
    return children();
  }
});
const template22 = (() => {
  var _v$9 = _$ssrRunInScope(() => _$escape(state.children()));
  return _$ssr(_tmpl$2, _v$9);
})();
const template23 = _$createComponent(Module, {
  get children() {
    return state.children();
  }
});
const template24 = _$ssrElement(
  "module",
  dynamic,
  ["Hi", _$memo(() => _$escape(dynamic.children))],
  false
);
const tiles = [];
tiles.push(_$ssr(_tmpl$5));
const template25 = (() => {
  var _v$10 = _$escape(tiles);
  return _$ssr(_tmpl$6, _v$10);
})();
const comma = (() => {
  var _v$11 = _$ssrRunInScope(() => _$escape((expression(), "static")));
  return _$ssr(_tmpl$6, _v$11);
})();
const double = (() => {
  var _v$12 = _$ssrRunInScope(() => _$escape(children()()));
  return _$ssr(_tmpl$6, _v$12);
})();
