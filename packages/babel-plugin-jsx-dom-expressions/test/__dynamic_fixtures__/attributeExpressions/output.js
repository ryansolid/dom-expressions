import { template as _$template } from "r-dom";
import { setProp as _$setProp } from "r-custom";
import { createElement as _$createElement } from "r-custom";
import { style as _$style } from "r-dom";
import { className as _$className } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { effect as _$effect } from "r-custom";
import { classList as _$classList } from "r-dom";
import { use as _$use } from "r-dom";
import { spread as _$spread } from "r-dom";
import { mergeProps as _$mergeProps } from "r-custom";
const _tmpl$ = /*#__PURE__*/ _$template(
    `<div id="main"><h1 class="base" id="my-h1"><a href="/">Welcome`
  ),
  _tmpl$2 = /*#__PURE__*/ _$template(`<div><div></div><div> </div><div>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<div class="a b">`),
  _tmpl$5 = /*#__PURE__*/ _$template(`<input type="checkbox" readonly="">`),
  _tmpl$6 = /*#__PURE__*/ _$template(`<input type="checkbox">`);
const selected = true;
let id = "my-h1";
let link;
const template = (() => {
  const _el$ = _tmpl$(),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.firstChild;
  _$spread(
    _el$,
    _$mergeProps(results, {
      classList: {
        selected: unknown
      },
      style: {
        color
      }
    }),
    false,
    true
  );
  _$spread(
    _el$2,
    _$mergeProps(results, {
      disabled: true,
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
    false,
    true
  );
  const _ref$ = link;
  typeof _ref$ === "function" ? _$use(_ref$, _el$3) : (link = _el$3);
  _$classList(_el$3, {
    "ccc ddd": true
  });
  return _el$;
})();
const template2 = (() => {
  const _el$4 = _tmpl$2(),
    _el$5 = _el$4.firstChild,
    _el$6 = _el$5.nextSibling,
    _el$7 = _el$6.firstChild,
    _el$8 = _el$6.nextSibling;
  _$spread(
    _el$4,
    _$mergeProps(() => getProps("test")),
    false,
    true
  );
  _el$5.textContent = rowId;
  _el$8.innerHTML = "<div/>";
  _$effect(() => (_el$7.data = row.label));
  return _el$4;
})();
const template3 = (() => {
  const _el$9 = _tmpl$3();
  _$setAttribute(_el$9, "id", state.id);
  state.color != null
    ? _el$9.style.setProperty("background-color", state.color)
    : _el$9.style.removeProperty("background-color");
  _el$9.textContent = state.content;
  _$effect(() => _$setAttribute(_el$9, "name", state.name));
  return _el$9;
})();
const template4 = (() => {
  const _el$10 = _tmpl$3();
  _$classList(_el$10, {
    "ccc:ddd": true
  });
  _$effect(() => _$className(_el$10, `hi ${state.class || ""}`));
  return _el$10;
})();
const template5 = _tmpl$4();
const template6 = (() => {
  const _el$12 = _tmpl$3();
  _el$12.textContent = "Hi";
  _$effect(_$p => _$style(_el$12, someStyle(), _$p));
  return _el$12;
})();
const template7 = (() => {
  const _el$13 = _tmpl$3();
  _$effect(
    _p$ => {
      const _v$ = {
          "background-color": color(),
          "margin-right": "40px",
          ...props.style
        },
        _v$2 = props.top,
        _v$3 = !!props.active;
      _p$._v$ = _$style(_el$13, _v$, _p$._v$);
      _v$2 !== _p$._v$2 &&
        ((_p$._v$2 = _v$2) != null
          ? _el$13.style.setProperty("padding-top", _v$2)
          : _el$13.style.removeProperty("padding-top"));
      _v$3 !== _p$._v$3 && _el$13.classList.toggle("my-class", (_p$._v$3 = _v$3));
      return _p$;
    },
    {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined
    }
  );
  return _el$13;
})();
let refTarget;
const template8 = (() => {
  const _el$14 = _tmpl$3();
  const _ref$2 = refTarget;
  typeof _ref$2 === "function" ? _$use(_ref$2, _el$14) : (refTarget = _el$14);
  return _el$14;
})();
const template9 = (() => {
  const _el$15 = _tmpl$3();
  _$use(e => console.log(e), _el$15);
  return _el$15;
})();
const template10 = (() => {
  const _el$16 = _tmpl$3();
  const _ref$3 = refFactory();
  typeof _ref$3 === "function" && _$use(_ref$3, _el$16);
  return _el$16;
})();
const template11 = (() => {
  const _el$17 = _tmpl$3();
  _$use(another, _el$17, () => thing);
  _$use(something, _el$17, () => true);
  return _el$17;
})();
const template12 = (() => {
  const _el$18 = _tmpl$3();
  _el$18.htmlFor = thing;
  return _el$18;
})();
const template13 = (() => {
  const _el$19 = _tmpl$5();
  _el$19.checked = true;
  return _el$19;
})();
const template14 = (() => {
  const _el$20 = _tmpl$6();
  _el$20.readOnly = value;
  _$effect(() => (_el$20.checked = state.visible));
  return _el$20;
})();
const template15 = (() => {
  const _el$21 = _$createElement("mesh");
  _$setProp(_el$21, "scale", [1, 1, 1]);
  _$setProp(_el$21, "rotateX", 0);
  return _el$21;
})();
