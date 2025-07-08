import { mergeProps as _$mergeProps } from "r-custom";
import { spread as _$spread } from "r-custom";
import { createTextNode as _$createTextNode } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { insert as _$insert } from "r-custom";
import { createComponent as _$createComponent } from "r-custom";
import { createElement as _$createElement } from "r-custom";
const children = _$createElement("div");
const dynamic = {
  children
};
const template = _$createComponent(Module, {
  children: children
});
const template2 = (() => {
  var _el$2 = _$createElement("module");
  _$insert(_el$2, children);
  return _el$2;
})();
const template3 = (() => {
  var _el$3 = _$createElement("module");
  _$insertNode(_el$3, _$createTextNode(`Hello`));
  return _el$3;
})();
const template4 = (() => {
  var _el$5 = _$createElement("module");
  _$insert(_el$5, _$createComponent(Hello, {}));
  return _el$5;
})();
const template5 = (() => {
  var _el$6 = _$createElement("module");
  _$insert(_el$6, () => dynamic.children);
  return _el$6;
})();
const template6 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template7 = (() => {
  var _el$7 = _$createElement("module");
  _$spread(_el$7, dynamic, false);
  return _el$7;
})();
const template8 = (() => {
  var _el$8 = _$createElement("module");
  _$insertNode(_el$8, _$createTextNode(`Hello`));
  _$spread(_el$8, dynamic, true);
  return _el$8;
})();
const template9 = (() => {
  var _el$0 = _$createElement("module");
  _$spread(_el$0, dynamic, true);
  _$insert(_el$0, () => dynamic.children);
  return _el$0;
})();
const template10 = _$createComponent(
  Module,
  _$mergeProps(dynamic, {
    children: "Hello"
  })
);
const template11 = (() => {
  var _el$1 = _$createElement("module");
  _$insert(_el$1, state.children);
  return _el$1;
})();
const template12 = _$createComponent(Module, {
  children: state.children
});
const template13 = (() => {
  var _el$10 = _$createElement("module");
  _$insert(_el$10, children);
  return _el$10;
})();
const template14 = _$createComponent(Module, {
  children: children
});
const template15 = (() => {
  var _el$11 = _$createElement("module");
  _$insert(_el$11, () => dynamic.children);
  return _el$11;
})();
const template16 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template18 = (() => {
  var _el$12 = _$createElement("module"),
    _el$13 = _$createTextNode(`Hi `);
  _$insertNode(_el$12, _el$13);
  _$insert(_el$12, children, null);
  return _el$12;
})();
const template19 = _$createComponent(Module, {
  get children() {
    return ["Hi ", children];
  }
});
const template20 = (() => {
  var _el$14 = _$createElement("module");
  _$insert(_el$14, children);
  return _el$14;
})();
const template21 = _$createComponent(Module, {
  get children() {
    return children();
  }
});
const template22 = (() => {
  var _el$15 = _$createElement("module");
  _$insert(_el$15, () => state.children());
  return _el$15;
})();
const template23 = _$createComponent(Module, {
  get children() {
    return state.children();
  }
});
const tiles = [];
tiles.push(
  (() => {
    var _el$16 = _$createElement("div");
    _$insertNode(_el$16, _$createTextNode(`Test 1`));
    return _el$16;
  })()
);
const template24 = (() => {
  var _el$18 = _$createElement("div");
  _$insert(_el$18, tiles);
  return _el$18;
})();
const comma = (() => {
  var _el$19 = _$createElement("div");
  _$insert(_el$19, () => (expression(), "static"));
  return _el$19;
})();
const double = (() => {
  var _el$20 = _$createElement("div");
  _$insert(_el$20, () => children()());
  return _el$20;
})();
