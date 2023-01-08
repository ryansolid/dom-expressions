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
  const _el$2 = _$createElement("module");
  _$insert(_el$2, children);
  return _el$2;
})();
const template3 = (() => {
  const _el$3 = _$createElement("module");
  _$insertNode(_el$3, _$createTextNode(`Hello`));
  return _el$3;
})();
const template4 = (() => {
  const _el$5 = _$createElement("module");
  _$insert(_el$5, _$createComponent(Hello, {}));
  return _el$5;
})();
const template5 = (() => {
  const _el$6 = _$createElement("module");
  _$insert(_el$6, () => dynamic.children);
  return _el$6;
})();
const template6 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template7 = (() => {
  const _el$7 = _$createElement("module");
  _$spread(_el$7, dynamic, false);
  return _el$7;
})();
const template8 = (() => {
  const _el$8 = _$createElement("module");
  _$insertNode(_el$8, _$createTextNode(`Hello`));
  _$spread(_el$8, dynamic, true);
  return _el$8;
})();
const template9 = (() => {
  const _el$10 = _$createElement("module");
  _$spread(_el$10, dynamic, true);
  _$insert(_el$10, () => dynamic.children);
  return _el$10;
})();
const template10 = _$createComponent(
  Module,
  _$mergeProps(dynamic, {
    children: "Hello"
  })
);
const template11 = (() => {
  const _el$11 = _$createElement("module");
  _$insert(_el$11, state.children);
  return _el$11;
})();
const template12 = _$createComponent(Module, {
  children: state.children
});
const template13 = (() => {
  const _el$12 = _$createElement("module");
  _$insert(_el$12, children);
  return _el$12;
})();
const template14 = _$createComponent(Module, {
  children: children
});
const template15 = (() => {
  const _el$13 = _$createElement("module");
  _$insert(_el$13, () => dynamic.children);
  return _el$13;
})();
const template16 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});
const template18 = (() => {
  const _el$14 = _$createElement("module"),
    _el$15 = _$createTextNode(`Hi `);
  _$insertNode(_el$14, _el$15);
  _$insert(_el$14, children, null);
  return _el$14;
})();
const template19 = _$createComponent(Module, {
  get children() {
    return ["Hi ", children];
  }
});
const template20 = (() => {
  const _el$16 = _$createElement("module");
  _$insert(_el$16, children);
  return _el$16;
})();
const template21 = _$createComponent(Module, {
  get children() {
    return children();
  }
});
const template22 = (() => {
  const _el$17 = _$createElement("module");
  _$insert(_el$17, () => state.children());
  return _el$17;
})();
const template23 = _$createComponent(Module, {
  get children() {
    return state.children();
  }
});
const tiles = [];
tiles.push(
  (() => {
    const _el$18 = _$createElement("div");
    _$insertNode(_el$18, _$createTextNode(`Test 1`));
    return _el$18;
  })()
);
const template24 = (() => {
  const _el$20 = _$createElement("div");
  _$insert(_el$20, tiles);
  return _el$20;
})();
const comma = (() => {
  const _el$21 = _$createElement("div");
  _$insert(_el$21, () => (expression(), "static"));
  return _el$21;
})();
