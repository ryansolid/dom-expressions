import { mergeProps as _$mergeProps } from "r-server";
import { ssrElement as _$ssrElement } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { escape as _$escape } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = ["<div", "></div>"],
  _tmpl$2 = ["<module", ">", "</module>"],
  _tmpl$3 = ["<module", ">Hello</module>"],
  _tmpl$4 = ["<module", ">Hi <!--$-->", "<!--/--></module>"],
  _tmpl$5 = ["<div", ">Test 1</div>"],
  _tmpl$6 = ["<div", ">", "</div>"];
const children = (() => {
  var _v$ = _$ssrHydrationKey();
  return _$ssr(_tmpl$, _v$);
})();
const dynamic = {
  children
};
const template = _$createComponent(Module, {
  children: children
});
const template2 = (() => {
  var _v$2 = _$ssrHydrationKey(),
    _v$3 = _$escape(children);
  return _$ssr(_tmpl$2, _v$2, _v$3);
})();
const template3 = (() => {
  var _v$4 = _$ssrHydrationKey();
  return _$ssr(_tmpl$3, _v$4);
})();
const template4 = (() => {
  var _v$5 = _$ssrHydrationKey(),
    _v$6 = _$escape(_$createComponent(Hello, {}));
  return _$ssr(_tmpl$2, _v$5, _v$6);
})();
const template5 = (() => {
  var _v$7 = _$ssrHydrationKey(),
    _v$8 = _$ssrRunInScope(() => _$escape(dynamic.children));
  return _$ssr(_tmpl$2, _v$7, _v$8);
})();
const template6 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template7 = _$ssrElement("module", dynamic, undefined, true);
const template8 = _$ssrElement("module", dynamic, () => "Hello", true);
const template9 = _$ssrElement("module", dynamic, () => () => _$escape(dynamic.children), true);
const template10 = _$createComponent(
  Module,
  _$mergeProps(dynamic, {
    children: "Hello"
  })
);
const template11 = (() => {
  var _v$9 = _$ssrHydrationKey(),
    _v$10 = _$escape(state.children);
  return _$ssr(_tmpl$2, _v$9, _v$10);
})();
const template12 = _$createComponent(Module, {
  children: state.children
});
const template13 = (() => {
  var _v$11 = _$ssrHydrationKey(),
    _v$12 = _$escape(children);
  return _$ssr(_tmpl$2, _v$11, _v$12);
})();
const template14 = _$createComponent(Module, {
  children: children
});
const template15 = (() => {
  var _v$13 = _$ssrHydrationKey(),
    _v$14 = _$ssrRunInScope(() => _$escape(dynamic.children));
  return _$ssr(_tmpl$2, _v$13, _v$14);
})();
const template16 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template18 = (() => {
  var _v$15 = _$ssrHydrationKey(),
    _v$16 = _$escape(children);
  return _$ssr(_tmpl$4, _v$15, _v$16);
})();
const template19 = _$createComponent(Module, {
  get children() {
    return ["Hi ", children];
  }
});
const template20 = (() => {
  var _v$17 = _$ssrHydrationKey(),
    _v$18 = _$ssrRunInScope(() => _$escape(children()));
  return _$ssr(_tmpl$2, _v$17, _v$18);
})();
const template21 = _$createComponent(Module, {
  get children() {
    return children();
  }
});
const template22 = (() => {
  var _v$19 = _$ssrHydrationKey(),
    _v$20 = _$ssrRunInScope(() => _$escape(state.children()));
  return _$ssr(_tmpl$2, _v$19, _v$20);
})();
const template23 = _$createComponent(Module, {
  get children() {
    return state.children();
  }
});
const template24 = _$ssrElement(
  "module",
  dynamic,
  () => ["Hi", "<!--$-->", () => _$escape(dynamic.children), "<!--/-->"],
  true
);
const tiles = [];
tiles.push(
  (() => {
    var _v$21 = _$ssrHydrationKey();
    return _$ssr(_tmpl$5, _v$21);
  })()
);
const template25 = (() => {
  var _v$22 = _$ssrHydrationKey(),
    _v$23 = _$escape(tiles);
  return _$ssr(_tmpl$6, _v$22, _v$23);
})();
const comma = (() => {
  var _v$24 = _$ssrHydrationKey(),
    _v$25 = _$ssrRunInScope(() => _$escape((expression(), "static")));
  return _$ssr(_tmpl$6, _v$24, _v$25);
})();
const double = (() => {
  var _v$26 = _$ssrHydrationKey(),
    _v$27 = _$ssrRunInScope(() => _$escape(children()()));
  return _$ssr(_tmpl$6, _v$26, _v$27);
})();
