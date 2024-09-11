import { template as _$template } from "r-dom";
import { mergeProps as _$mergeProps } from "r-dom";
import { spread as _$spread } from "r-dom";
import { insert as _$insert } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$2 = /*#__PURE__*/ _$template(`<module>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<module>Hello`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<module>Hi `),
  _tmpl$5 = /*#__PURE__*/ _$template(`<module>Hi`),
  _tmpl$6 = /*#__PURE__*/ _$template(`<div>Test 1`);
const children = _tmpl$();
const dynamic = {
  children
};
const template = _$createComponent(Module, {
  children: children
});
const template2 = (() => {
  var _el$2 = _tmpl$2();
  _$insert(_el$2, children);
  return _el$2;
})();
const template3 = _tmpl$3();
const template4 = (() => {
  var _el$4 = _tmpl$2();
  _$insert(_el$4, _$createComponent(Hello, {}));
  return _el$4;
})();
const template5 = (() => {
  var _el$5 = _tmpl$2();
  _$insert(_el$5, () => dynamic.children);
  return _el$5;
})();
const template6 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template7 = (() => {
  var _el$6 = _tmpl$2();
  _$spread(_el$6, dynamic, false, false);
  return _el$6;
})();
const template8 = (() => {
  var _el$7 = _tmpl$3();
  _$spread(_el$7, dynamic, false, true);
  return _el$7;
})();
const template9 = (() => {
  var _el$8 = _tmpl$2();
  _$spread(_el$8, dynamic, false, true);
  _$insert(_el$8, () => dynamic.children);
  return _el$8;
})();
const template10 = _$createComponent(
  Module,
  _$mergeProps(dynamic, {
    children: "Hello"
  })
);
const template11 = (() => {
  var _el$9 = _tmpl$2();
  _$insert(_el$9, state.children);
  return _el$9;
})();
const template12 = _$createComponent(Module, {
  children: state.children
});
const template13 = (() => {
  var _el$10 = _tmpl$2();
  _$insert(_el$10, children);
  return _el$10;
})();
const template14 = _$createComponent(Module, {
  children: children
});
const template15 = (() => {
  var _el$11 = _tmpl$2();
  _$insert(_el$11, () => dynamic.children);
  return _el$11;
})();
const template16 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template18 = (() => {
  var _el$12 = _tmpl$4();
  _$insert(_el$12, children, null);
  return _el$12;
})();
const template19 = _$createComponent(Module, {
  get children() {
    return ["Hi ", children];
  }
});
const template20 = (() => {
  var _el$13 = _tmpl$2();
  _$insert(_el$13, children);
  return _el$13;
})();
const template21 = _$createComponent(Module, {
  get children() {
    return children();
  }
});
const template22 = (() => {
  var _el$14 = _tmpl$2();
  _$insert(_el$14, () => state.children());
  return _el$14;
})();
const template23 = _$createComponent(Module, {
  get children() {
    return state.children();
  }
});
const template24 = (() => {
  var _el$15 = _tmpl$5(),
    _el$16 = _el$15.firstChild;
  _$spread(_el$15, dynamic, false, true);
  _$insert(_el$15, () => dynamic.children, null);
  return _el$15;
})();
const tiles = [];
tiles.push(_tmpl$6());
const template25 = (() => {
  var _el$18 = _tmpl$();
  _$insert(_el$18, tiles);
  return _el$18;
})();
const comma = (() => {
  var _el$19 = _tmpl$();
  _$insert(_el$19, () => (expression(), "static"));
  return _el$19;
})();
const double = (() => {
  var _el$20 = _tmpl$();
  _$insert(_el$20, () => children()());
  return _el$20;
})();
