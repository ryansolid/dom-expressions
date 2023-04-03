import { template as _$template } from "r-dom";
import { delegateEvents as _$delegateEvents } from "r-dom";
import { getNextMarker as _$getNextMarker } from "r-dom";
import { insert as _$insert } from "r-dom";
import { memo as _$memo } from "r-dom";
import { addEventListener as _$addEventListener } from "r-dom";
import { style as _$style } from "r-dom";
import { className as _$className } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { effect as _$effect } from "r-dom";
import { innerHTML as _$innerHTML } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { runHydrationEvents as _$runHydrationEvents } from "r-dom";
import { classList as _$classList } from "r-dom";
import { use as _$use } from "r-dom";
import { spread as _$spread } from "r-dom";
import { mergeProps as _$mergeProps } from "r-dom";
const _tmpl$ = /*#__PURE__*/ _$template(
    `<div id="main"><h1 class="base" id="my-h1"><a href="/">Welcome`
  ),
  _tmpl$2 = /*#__PURE__*/ _$template(`<div><div></div><div> </div><div>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<div foo>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$5 = /*#__PURE__*/ _$template(`<div class="a b">`),
  _tmpl$6 = /*#__PURE__*/ _$template(`<input type="checkbox">`),
  _tmpl$7 = /*#__PURE__*/ _$template(`<div class="\`a">\`$\``),
  _tmpl$8 = /*#__PURE__*/ _$template(`<button class="static hi" type="button">Write`),
  _tmpl$9 = /*#__PURE__*/ _$template(`<button class="a b c">Hi`),
  _tmpl$10 = /*#__PURE__*/ _$template(`<div class="bg-red-500 flex flex-col">`),
  _tmpl$11 = /*#__PURE__*/ _$template(`<div><input readonly=""><input>`),
  _tmpl$12 = /*#__PURE__*/ _$template(`<div data="&quot;hi&quot;" data2="&quot;">`),
  _tmpl$13 = /*#__PURE__*/ _$template(`<a>`),
  _tmpl$14 = /*#__PURE__*/ _$template(`<div><!#><!/><a>`),
  _tmpl$15 = /*#__PURE__*/ _$template(`<div start="Hi">Hi`),
  _tmpl$16 = /*#__PURE__*/ _$template(`<label><span>Input is <!#><!/></span><input><div>`),
  _tmpl$17 =
    /*#__PURE__*/ _$template(`<div class="class1 class2 class3 class4 class5 class6" style="color:red;background-color:blue !important;border:1px solid black;font-size:12px;" random="random1 random2
    random3 random4">`);
const selected = true;
let id = "my-h1";
let link;
const template = (() => {
  const _el$ = _$getNextElement(_tmpl$),
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
      foo: "",
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
  _$runHydrationEvents();
  return _el$;
})();
const template2 = (() => {
  const _el$4 = _$getNextElement(_tmpl$2),
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
  _$innerHTML(_el$8, "<div/>");
  _$effect(() => (_el$7.data = row.label));
  _$runHydrationEvents();
  return _el$4;
})();
const template3 = (() => {
  const _el$9 = _$getNextElement(_tmpl$3);
  _$setAttribute(_el$9, "id", state.id);
  state.color != null
    ? _el$9.style.setProperty("background-color", state.color)
    : _el$9.style.removeProperty("background-color");
  _el$9.textContent = state.content;
  _$effect(() => _$setAttribute(_el$9, "name", state.name));
  return _el$9;
})();
const template4 = (() => {
  const _el$10 = _$getNextElement(_tmpl$4);
  _$classList(_el$10, {
    "ccc:ddd": true
  });
  _$effect(() => _$className(_el$10, `hi ${state.class || ""}`));
  return _el$10;
})();
const template5 = _$getNextElement(_tmpl$5);
const template6 = (() => {
  const _el$12 = _$getNextElement(_tmpl$4);
  _el$12.textContent = "Hi";
  _$effect(_$p => _$style(_el$12, someStyle(), _$p));
  return _el$12;
})();
const template7 = (() => {
  const _el$13 = _$getNextElement(_tmpl$4);
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
  const _el$14 = _$getNextElement(_tmpl$4);
  const _ref$2 = refTarget;
  typeof _ref$2 === "function" ? _$use(_ref$2, _el$14) : (refTarget = _el$14);
  return _el$14;
})();
const template9 = (() => {
  const _el$15 = _$getNextElement(_tmpl$4);
  _$use(e => console.log(e), _el$15);
  return _el$15;
})();
const template10 = (() => {
  const _el$16 = _$getNextElement(_tmpl$4);
  const _ref$3 = refFactory();
  typeof _ref$3 === "function" && _$use(_ref$3, _el$16);
  return _el$16;
})();
const template11 = (() => {
  const _el$17 = _$getNextElement(_tmpl$4);
  _$use(zero, _el$17, () => 0);
  _$use(another, _el$17, () => thing);
  _$use(something, _el$17, () => true);
  return _el$17;
})();
const template12 = (() => {
  const _el$18 = _$getNextElement(_tmpl$4);
  _el$18.htmlFor = thing;
  return _el$18;
})();
const template13 = (() => {
  const _el$19 = _$getNextElement(_tmpl$6);
  _el$19.checked = true;
  return _el$19;
})();
const template14 = (() => {
  const _el$20 = _$getNextElement(_tmpl$6);
  _$effect(() => (_el$20.checked = state.visible));
  return _el$20;
})();
const template15 = _$getNextElement(_tmpl$7);
const template16 = _$getNextElement(_tmpl$8);
const template17 = (() => {
  const _el$23 = _$getNextElement(_tmpl$9);
  _$addEventListener(_el$23, "click", increment, true);
  _$runHydrationEvents();
  return _el$23;
})();
const template18 = (() => {
  const _el$24 = _$getNextElement(_tmpl$4);
  _$spread(
    _el$24,
    _$mergeProps(() => ({
      get [key()]() {
        return props.value;
      }
    })),
    false,
    false
  );
  _$runHydrationEvents();
  return _el$24;
})();
const template19 = _$getNextElement(_tmpl$10);
const template20 = (() => {
  const _el$26 = _$getNextElement(_tmpl$11),
    _el$27 = _el$26.firstChild,
    _el$28 = _el$27.nextSibling;
  _$addEventListener(_el$27, "input", doSomething, true);
  _$addEventListener(_el$28, "input", doSomethingElse, true);
  _el$28.readOnly = value;
  _$effect(
    _p$ => {
      const _v$4 = min(),
        _v$5 = max(),
        _v$6 = min(),
        _v$7 = max();
      _v$4 !== _p$._v$4 && _$setAttribute(_el$27, "min", (_p$._v$4 = _v$4));
      _v$5 !== _p$._v$5 && _$setAttribute(_el$27, "max", (_p$._v$5 = _v$5));
      _v$6 !== _p$._v$6 && _$setAttribute(_el$28, "min", (_p$._v$6 = _v$6));
      _v$7 !== _p$._v$7 && _$setAttribute(_el$28, "max", (_p$._v$7 = _v$7));
      return _p$;
    },
    {
      _v$4: undefined,
      _v$5: undefined,
      _v$6: undefined,
      _v$7: undefined
    }
  );
  _$effect(() => (_el$27.value = s()));
  _$effect(() => (_el$28.checked = s2()));
  _$runHydrationEvents();
  return _el$26;
})();
const template21 = (() => {
  const _el$29 = _$getNextElement(_tmpl$4);
  _$effect(_$p =>
    _$style(
      _el$29,
      {
        a: "static",
        ...rest
      },
      _$p
    )
  );
  return _el$29;
})();
const template22 = _$getNextElement(_tmpl$12);
const template23 = (() => {
  const _el$31 = _$getNextElement(_tmpl$4);
  _$insert(_el$31, () => "t" in test && "true");
  _$effect(() => (_el$31.disabled = "t" in test));
  return _el$31;
})();
const template24 = (() => {
  const _el$32 = _$getNextElement(_tmpl$13);
  _$spread(
    _el$32,
    _$mergeProps(props, {
      something: ""
    }),
    false,
    false
  );
  _$runHydrationEvents();
  return _el$32;
})();
const template25 = (() => {
  const _el$33 = _$getNextElement(_tmpl$14),
    _el$35 = _el$33.firstChild,
    [_el$36, _co$] = _$getNextMarker(_el$35.nextSibling),
    _el$34 = _el$36.nextSibling;
  _$insert(_el$33, () => props.children, _el$36, _co$);
  _$spread(
    _el$34,
    _$mergeProps(props, {
      something: ""
    }),
    false,
    false
  );
  _$runHydrationEvents();
  return _el$33;
})();
const template26 = (() => {
  const _el$37 = _$getNextElement(_tmpl$15);
  _$setAttribute(_el$37, "middle", middle);
  _$spread(_el$37, spread, false, true);
  _$runHydrationEvents();
  return _el$37;
})();
const template27 = (() => {
  const _el$38 = _$getNextElement(_tmpl$15);
  _$spread(
    _el$38,
    _$mergeProps(
      first,
      {
        middle: middle
      },
      second
    ),
    false,
    true
  );
  _$runHydrationEvents();
  return _el$38;
})();
const template28 = (() => {
  const _el$39 = _$getNextElement(_tmpl$16),
    _el$40 = _el$39.firstChild,
    _el$41 = _el$40.firstChild,
    _el$42 = _el$41.nextSibling,
    [_el$43, _co$2] = _$getNextMarker(_el$42.nextSibling),
    _el$44 = _el$40.nextSibling,
    _el$45 = _el$44.nextSibling;
  _$spread(_el$39, _$mergeProps(api), false, true);
  _$spread(_el$40, _$mergeProps(api), false, true);
  _$insert(_el$40, () => (api() ? "checked" : "unchecked"), _el$43, _co$2);
  _$spread(_el$44, _$mergeProps(api), false, false);
  _$spread(_el$45, _$mergeProps(api), false, false);
  _$runHydrationEvents();
  return _el$39;
})();
const template29 = (() => {
  const _el$46 = _$getNextElement(_tmpl$4);
  _$setAttribute(_el$46, "attribute", !!someValue);
  _$insert(_el$46, !!someValue);
  return _el$46;
})();
const template30 = _$getNextElement(_tmpl$17);
_$delegateEvents(["click", "input"]);
