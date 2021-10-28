import { effect as _$effect } from "r-custom";
import { createTextNode as _$createTextNode } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { spread as _$spread } from "r-custom";
import { setProp as _$setProp } from "r-custom";
import { createElement as _$createElement } from "r-custom";
const selected = true;
let link;

const template = (() => {
  const _el$ = _$createElement("div"),
    _el$2 = _$createElement("h1"),
    _el$3 = _$createElement("a");

  _$insertNode(_el$, _el$2);

  _$setProp(_el$, "id", "main");

  _$spread(_el$, results, true);

  _$setProp(_el$, "style", {
    color
  });

  _$insertNode(_el$2, _el$3);

  _$setProp(_el$2, "class", "base");

  _$spread(_el$2, results, true);

  _$setProp(_el$2, "disabled", true);

  _$setProp(_el$2, "readonly", "");

  _$insertNode(_el$3, _$createTextNode("Welcome"));

  const _ref$ = link;
  typeof _ref$ === "function" ? _ref$(_el$3) : (link = _el$3);

  _$setProp(_el$3, "href", "/");

  _$setProp(_el$3, "readonly", value);

  _$effect(
    _p$ => {
      const _v$ = welcoming(),
        _v$2 = {
          "background-color": color(),
          "margin-right": "40px"
        },
        _v$3 = {
          dynamic: dynamic(),
          selected
        };

      _v$ !== _p$._v$ && (_p$._v$ = _$setProp(_el$2, "title", _v$, _p$._v$));
      _v$2 !== _p$._v$2 && (_p$._v$2 = _$setProp(_el$2, "style", _v$2, _p$._v$2));
      _v$3 !== _p$._v$3 && (_p$._v$3 = _$setProp(_el$2, "classList", _v$3, _p$._v$3));
      return _p$;
    },
    {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined
    }
  );

  return _el$;
})();

const template2 = (() => {
  const _el$5 = _$createElement("div"),
    _el$6 = _$createElement("div"),
    _el$7 = _$createElement("div"),
    _el$8 = _$createElement("div");

  _$insertNode(_el$5, _el$6);

  _$insertNode(_el$5, _el$7);

  _$insertNode(_el$5, _el$8);

  _$spread(_el$5, () => getProps("test"), true);

  _$setProp(_el$6, "textContent", rowId);

  _$setProp(_el$8, "innerHTML", "<div/>");

  _$effect(_$p => _$setProp(_el$7, "textContent", row.label, _$p));

  return _el$5;
})();

const template3 = (() => {
  const _el$9 = _$createElement("div");

  _$setProp(_el$9, "id", state.id);

  _$setProp(_el$9, "style", {
    "background-color": state.color
  });

  _$setProp(_el$9, "textContent", state.content);

  _$effect(_$p => _$setProp(_el$9, "name", state.name, _$p));

  return _el$9;
})();

const template4 = (() => {
  const _el$10 = _$createElement("div");

  _$setProp(_el$10, "class", "hi");

  _$setProp(_el$10, "classList", {
    "ccc:ddd": true
  });

  _$effect(_$p => _$setProp(_el$10, "className", state.class, _$p));

  return _el$10;
})();

const template5 = (() => {
  const _el$11 = _$createElement("div");

  _$setProp(_el$11, "class", "a");

  _$setProp(_el$11, "className", "b");

  return _el$11;
})();

const template6 = (() => {
  const _el$12 = _$createElement("div");

  _$setProp(_el$12, "textContent", "Hi");

  _$effect(_$p => _$setProp(_el$12, "style", someStyle(), _$p));

  return _el$12;
})();

const template7 = (() => {
  const _el$13 = _$createElement("div");

  _$effect(
    _p$ => {
      const _v$4 = {
          "background-color": color(),
          "margin-right": "40px",
          ...props.style
        },
        _v$5 = props.top,
        _v$6 = props.active;
      _v$4 !== _p$._v$4 && (_p$._v$4 = _$setProp(_el$13, "style", _v$4, _p$._v$4));
      _v$5 !== _p$._v$5 && (_p$._v$5 = _$setProp(_el$13, "style:padding-top", _v$5, _p$._v$5));
      _v$6 !== _p$._v$6 && (_p$._v$6 = _$setProp(_el$13, "class:my-class", _v$6, _p$._v$6));
      return _p$;
    },
    {
      _v$4: undefined,
      _v$5: undefined,
      _v$6: undefined
    }
  );

  return _el$13;
})();

let refTarget;

const template8 = (() => {
  const _el$14 = _$createElement("div");

  const _ref$2 = refTarget;
  typeof _ref$2 === "function" ? _ref$2(_el$14) : (refTarget = _el$14);
  return _el$14;
})();

const template9 = (() => {
  const _el$15 = _$createElement("div");

  (e => console.log(e))(_el$15);

  return _el$15;
})();

const template10 = (() => {
  const _el$16 = _$createElement("div");

  const _ref$3 = refFactory();

  typeof _ref$3 === "function" && _ref$3(_el$16);
  return _el$16;
})();

const template11 = (() => {
  const _el$17 = _$createElement("div");

  another(_el$17, () => thing);
  something(_el$17, () => true);
  return _el$17;
})();

const template12 = (() => {
  const _el$18 = _$createElement("div");

  _$setProp(_el$18, "prop:htmlFor", thing);

  return _el$18;
})();

const template13 = (() => {
  const _el$19 = _$createElement("input");

  _$setProp(_el$19, "type", "checkbox");

  _$setProp(_el$19, "checked", true);

  return _el$19;
})();

const template14 = (() => {
  const _el$20 = _$createElement("input");

  _$setProp(_el$20, "type", "checkbox");

  _$effect(_$p => _$setProp(_el$20, "checked", state.visible, _$p));

  return _el$20;
})();
