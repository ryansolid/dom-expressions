import { effect as _$effect } from "r-custom";
import { createTextNode as _$createTextNode } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { use as _$use } from "r-custom";
import { setProp as _$setProp } from "r-custom";
import { spread as _$spread } from "r-custom";
import { mergeProps as _$mergeProps } from "r-custom";
import { createElement as _$createElement } from "r-custom";
const selected = true;
let link;
const template = (() => {
  var _el$ = _$createElement("div"),
    _el$2 = _$createElement("h1"),
    _el$3 = _$createElement("a");
  _$insertNode(_el$, _el$2);
  _$setProp(_el$, "id", "main");
  _$spread(
    _el$,
    _$mergeProps(results, {
      style: {
        color
      }
    }),
    true
  );
  _$insertNode(_el$2, _el$3);
  _$setProp(_el$2, "class", "base");
  _$spread(
    _el$2,
    _$mergeProps(results, {
      disabled: true,
      readonly: "",
      get title() {
        return welcoming();
      },
      get style() {
        return {
          "background-color": color(),
          "margin-right": "40px"
        };
      },
      get classList() {
        return {
          dynamic: dynamic(),
          selected
        };
      }
    }),
    true
  );
  _$insertNode(_el$3, _$createTextNode(`Welcome`));
  var _ref$ = link;
  typeof _ref$ === "function" ? _$use(_ref$, _el$3) : (link = _el$3);
  _$setProp(_el$3, "href", "/");
  _$setProp(_el$3, "readonly", value);
  return _el$;
})();
const template2 = (() => {
  var _el$5 = _$createElement("div"),
    _el$6 = _$createElement("div"),
    _el$7 = _$createElement("div"),
    _el$8 = _$createElement("div");
  _$insertNode(_el$5, _el$6);
  _$insertNode(_el$5, _el$7);
  _$insertNode(_el$5, _el$8);
  _$spread(
    _el$5,
    _$mergeProps(() => getProps("test")),
    true
  );
  _$setProp(_el$6, "textContent", rowId);
  _$setProp(_el$8, "innerHTML", "<div/>");
  _$effect(_$p => _$setProp(_el$7, "textContent", row.label, _$p));
  return _el$5;
})();
const template3 = (() => {
  var _el$9 = _$createElement("div");
  _$setProp(_el$9, "id", state.id);
  _$setProp(_el$9, "style", {
    "background-color": state.color
  });
  _$setProp(_el$9, "textContent", state.content);
  _$effect(_$p => _$setProp(_el$9, "name", state.name, _$p));
  return _el$9;
})();
const template4 = (() => {
  var _el$10 = _$createElement("div");
  _$setProp(_el$10, "class", "hi");
  _$setProp(_el$10, "classList", {
    "ccc:ddd": true
  });
  _$effect(_$p => _$setProp(_el$10, "className", state.class, _$p));
  return _el$10;
})();
const template5 = (() => {
  var _el$11 = _$createElement("div");
  _$setProp(_el$11, "class", "a");
  _$setProp(_el$11, "className", "b");
  return _el$11;
})();
const template6 = (() => {
  var _el$12 = _$createElement("div");
  _$setProp(_el$12, "textContent", "Hi");
  _$effect(_$p => _$setProp(_el$12, "style", someStyle(), _$p));
  return _el$12;
})();
const template7 = (() => {
  var _el$13 = _$createElement("div");
  _$effect(
    _p$ => {
      var _v$ = {
          "background-color": color(),
          "margin-right": "40px",
          ...props.style
        },
        _v$2 = props.top,
        _v$3 = props.active;
      _v$ !== _p$.e && (_p$.e = _$setProp(_el$13, "style", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp(_el$13, "style:padding-top", _v$2, _p$.t));
      _v$3 !== _p$.a && (_p$.a = _$setProp(_el$13, "class:my-class", _v$3, _p$.a));
      return _p$;
    },
    {
      e: undefined,
      t: undefined,
      a: undefined
    }
  );
  return _el$13;
})();
let refTarget;
const template8 = (() => {
  var _el$14 = _$createElement("div");
  var _ref$2 = refTarget;
  typeof _ref$2 === "function" ? _$use(_ref$2, _el$14) : (refTarget = _el$14);
  return _el$14;
})();
const template9 = (() => {
  var _el$15 = _$createElement("div");
  _$use(e => console.log(e), _el$15);
  return _el$15;
})();
const template10 = (() => {
  var _el$16 = _$createElement("div");
  var _ref$3 = refFactory();
  typeof _ref$3 === "function" && _$use(_ref$3, _el$16);
  return _el$16;
})();
const template11 = (() => {
  var _el$17 = _$createElement("div");
  _$use(zero, _el$17, () => 0);
  _$use(another, _el$17, () => thing);
  _$use(something, _el$17, () => true);
  return _el$17;
})();
const template12 = (() => {
  var _el$18 = _$createElement("div");
  _$setProp(_el$18, "prop:htmlFor", thing);
  return _el$18;
})();
const template13 = (() => {
  var _el$19 = _$createElement("input");
  _$setProp(_el$19, "type", "checkbox");
  _$setProp(_el$19, "checked", true);
  return _el$19;
})();
const template14 = (() => {
  var _el$20 = _$createElement("input");
  _$setProp(_el$20, "type", "checkbox");
  _$effect(_$p => _$setProp(_el$20, "checked", state.visible, _$p));
  return _el$20;
})();
const template15 = (() => {
  var _el$21 = _$createElement("div");
  _$insertNode(_el$21, _$createTextNode(`\`$\``));
  _$setProp(_el$21, "class", "`a");
  return _el$21;
})();
const template16 = (() => {
  var _el$23 = _$createElement("button");
  _$insertNode(_el$23, _$createTextNode(`Write`));
  _$setProp(_el$23, "class", "static");
  _$setProp(_el$23, "classList", {
    hi: "k"
  });
  _$setProp(_el$23, "type", "button");
  return _el$23;
})();
const template17 = (() => {
  var _el$25 = _$createElement("button");
  _$insertNode(_el$25, _$createTextNode(`Hi`));
  _$setProp(_el$25, "classList", {
    a: true,
    b: true,
    c: true
  });
  _$setProp(_el$25, "onClick", increment);
  return _el$25;
})();
const template18 = (() => {
  var _el$27 = _$createElement("div");
  _$spread(
    _el$27,
    _$mergeProps(() => ({
      get [key()]() {
        return props.value;
      }
    })),
    false
  );
  return _el$27;
})();
const template19 = (() => {
  var _el$28 = _$createElement("div");
  _$effect(_$p =>
    _$setProp(
      _el$28,
      "style",
      {
        a: "static",
        ...rest
      },
      _$p
    )
  );
  return _el$28;
})();
const template20 = (() => {
  var _el$29 = _$createElement("div");
  _$use(zero, _el$29, () => 0);
  _$use(something, _el$29, () => true);
  _$spread(_el$29, somethingElse, false);
  return _el$29;
})();
const template21 = (() => {
  var _el$30 = _$createElement("div");
  var _ref$4 = a().b.c;
  typeof _ref$4 === "function" ? _$use(_ref$4, _el$30) : (a().b.c = _el$30);
  return _el$30;
})();
const template22 = (() => {
  var _el$31 = _$createElement("div");
  var _ref$5 = a().b?.c;
  typeof _ref$5 === "function" && _$use(_ref$5, _el$31);
  return _el$31;
})();
const template23 = (() => {
  var _el$32 = _$createElement("div");
  var _ref$6 = a() ? b : c;
  typeof _ref$6 === "function" && _$use(_ref$6, _el$32);
  return _el$32;
})();
const template24 = (() => {
  var _el$33 = _$createElement("div");
  var _ref$7 = a() ?? b;
  typeof _ref$7 === "function" && _$use(_ref$7, _el$33);
  return _el$33;
})();
