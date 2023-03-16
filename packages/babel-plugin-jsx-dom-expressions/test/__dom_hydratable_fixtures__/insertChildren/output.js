import { template as _$template } from "r-dom";
import { getNextMarker as _$getNextMarker } from "r-dom";
import { mergeProps as _$mergeProps } from "r-dom";
import { runHydrationEvents as _$runHydrationEvents } from "r-dom";
import { spread as _$spread } from "r-dom";
import { insert as _$insert } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
const _tmpl$ = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$2 = /*#__PURE__*/ _$template(`<module>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<module>Hello`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<module>Hi <!#><!/>`),
  _tmpl$5 = /*#__PURE__*/ _$template(`<module>Hi<!#><!/>`),
  _tmpl$6 = /*#__PURE__*/ _$template(`<div>Test 1`);
const children = _$getNextElement(_tmpl$);
const dynamic = {
  children
};
const template = _$createComponent(Module, {
  children: children
});
const template2 = (() => {
  const _el$2 = _$getNextElement(_tmpl$2);
  _$insert(_el$2, children);
  return _el$2;
})();
const template3 = _$getNextElement(_tmpl$3);
const template4 = (() => {
  const _el$4 = _$getNextElement(_tmpl$2);
  _$insert(_el$4, _$createComponent(Hello, {}));
  return _el$4;
})();
const template5 = (() => {
  const _el$5 = _$getNextElement(_tmpl$2);
  _$insert(_el$5, () => dynamic.children);
  return _el$5;
})();
const template6 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template7 = (() => {
  const _el$6 = _$getNextElement(_tmpl$2);
  _$spread(_el$6, dynamic, false, false);
  _$runHydrationEvents();
  return _el$6;
})();
const template8 = (() => {
  const _el$7 = _$getNextElement(_tmpl$3);
  _$spread(_el$7, dynamic, false, true);
  _$runHydrationEvents();
  return _el$7;
})();
const template9 = (() => {
  const _el$8 = _$getNextElement(_tmpl$2);
  _$spread(_el$8, dynamic, false, true);
  _$insert(_el$8, () => dynamic.children);
  _$runHydrationEvents();
  return _el$8;
})();
const template10 = _$createComponent(
  Module,
  _$mergeProps(dynamic, {
    children: "Hello"
  })
);
const template11 = (() => {
  const _el$9 = _$getNextElement(_tmpl$2);
  _$insert(_el$9, state.children);
  return _el$9;
})();
const template12 = _$createComponent(Module, {
  children: state.children
});
const template13 = (() => {
  const _el$10 = _$getNextElement(_tmpl$2);
  _$insert(_el$10, children);
  return _el$10;
})();
const template14 = _$createComponent(Module, {
  children: children
});
const template15 = (() => {
  const _el$11 = _$getNextElement(_tmpl$2);
  _$insert(_el$11, () => dynamic.children);
  return _el$11;
})();
const template16 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template18 = (() => {
  const _el$12 = _$getNextElement(_tmpl$4),
    _el$13 = _el$12.firstChild,
    [_el$14, _co$] = _$getNextMarker(_el$13.nextSibling);
  _$insert(_el$12, children, _el$14, _co$);
  return _el$12;
})();
const template19 = _$createComponent(Module, {
  get children() {
    return ["Hi ", children];
  }
});
const template20 = (() => {
  const _el$15 = _$getNextElement(_tmpl$2);
  _$insert(_el$15, children);
  return _el$15;
})();
const template21 = _$createComponent(Module, {
  get children() {
    return children();
  }
});
const template22 = (() => {
  const _el$16 = _$getNextElement(_tmpl$2);
  _$insert(_el$16, () => state.children());
  return _el$16;
})();
const template23 = _$createComponent(Module, {
  get children() {
    return state.children();
  }
});
const template24 = (() => {
  const _el$17 = _$getNextElement(_tmpl$5),
    _el$18 = _el$17.firstChild,
    _el$19 = _el$18.nextSibling,
    [_el$20, _co$2] = _$getNextMarker(_el$19.nextSibling);
  _$spread(_el$17, dynamic, false, true);
  _$insert(_el$17, () => dynamic.children, _el$20, _co$2);
  _$runHydrationEvents();
  return _el$17;
})();
const tiles = [];
tiles.push(_$getNextElement(_tmpl$6));
const template25 = (() => {
  const _el$22 = _$getNextElement(_tmpl$);
  _$insert(_el$22, tiles);
  return _el$22;
})();
const comma = (() => {
  const _el$23 = _$getNextElement(_tmpl$);
  _$insert(_el$23, () => (expression(), "static"));
  return _el$23;
})();
