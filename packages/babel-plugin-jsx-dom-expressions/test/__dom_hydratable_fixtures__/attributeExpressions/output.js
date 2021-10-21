import { template as _$template } from "r-dom";
import { style as _$style } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { effect as _$effect } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { runHydrationEvents as _$runHydrationEvents } from "r-dom";
import { classList as _$classList } from "r-dom";
import { spread as _$spread } from "r-dom";

const _tmpl$ = _$template(
    `<div id="main"><h1 class="base selected" disabled readonly=""><a href="/">Welcome</a></h1></div>`,
    6
  ),
  _tmpl$2 = _$template(`<div><div></div><div> </div><div></div></div>`, 8),
  _tmpl$3 = _$template(`<div></div>`, 2),
  _tmpl$4 = _$template(`<div class="a b"></div>`, 2),
  _tmpl$5 = _$template(`<input type="checkbox">`, 1);

const selected = true;
let link;

const template = (() => {
  const _el$ = _$getNextElement(_tmpl$),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.firstChild;

  _$spread(_el$, results, false, true);

  _el$.classList.toggle("selected", unknown);

  _el$.style.setProperty("color", color);

  _$spread(_el$2, results, false, true);

  _el$2.style.setProperty("margin-right", "40px");

  const _ref$ = link;
  typeof _ref$ === "function" ? _ref$(_el$3) : (link = _el$3);

  _$classList(_el$3, {
    "ccc ddd": true
  });

  _el$3.readOnly = value;

  _$effect(
    _p$ => {
      const _v$ = welcoming(),
        _v$2 = color(),
        _v$3 = dynamic();

      _v$ !== _p$._v$ && _$setAttribute(_el$2, "title", (_p$._v$ = _v$));
      _v$2 !== _p$._v$2 && _el$2.style.setProperty("background-color", (_p$._v$2 = _v$2));
      _v$3 !== _p$._v$3 && _el$2.classList.toggle("dynamic", (_p$._v$3 = _v$3));
      return _p$;
    },
    {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined
    }
  );

  _$runHydrationEvents();

  return _el$;
})();

const template2 = (() => {
  const _el$4 = _$getNextElement(_tmpl$2),
    _el$5 = _el$4.firstChild,
    _el$6 = _el$5.nextSibling,
    _el$7 = _el$6.firstChild,
    _el$8 = _el$6.nextSibling;

  _el$5.textContent = rowId;
  _el$8.innerHTML = "<div/>";

  _$effect(() => (_el$7.data = row.label));

  return _el$4;
})();

const template3 = (() => {
  const _el$9 = _$getNextElement(_tmpl$3);

  _$setAttribute(_el$9, "id", state.id);

  _el$9.style.setProperty("background-color", state.color);

  _el$9.textContent = state.content;

  _$effect(() => _$setAttribute(_el$9, "name", state.name));

  return _el$9;
})();

const template4 = (() => {
  const _el$10 = _$getNextElement(_tmpl$3);

  _$classList(_el$10, {
    "ccc:ddd": true
  });

  _$effect(() => (_el$10.className = `hi ${state.class || ""}`));

  return _el$10;
})();

const template5 = _$getNextElement(_tmpl$4);

const template6 = (() => {
  const _el$12 = _$getNextElement(_tmpl$3);

  _el$12.textContent = "Hi";

  _$effect(_$p => _$style(_el$12, someStyle(), _$p));

  return _el$12;
})();

const template7 = (() => {
  const _el$13 = _$getNextElement(_tmpl$3);

  _$effect(
    _p$ => {
      const _v$4 = {
          "background-color": color(),
          "margin-right": "40px",
          ...props.style
        },
        _v$5 = props.top,
        _v$6 = props.active;
      _p$._v$4 = _$style(_el$13, _v$4, _p$._v$4);
      _v$5 !== _p$._v$5 && _el$13.style.setProperty("padding-top", (_p$._v$5 = _v$5));
      _v$6 !== _p$._v$6 && _el$13.classList.toggle("my-class", (_p$._v$6 = _v$6));
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
  const _el$14 = _$getNextElement(_tmpl$3);

  const _ref$2 = refTarget;
  typeof _ref$2 === "function" ? _ref$2(_el$14) : (refTarget = _el$14);
  return _el$14;
})();

const template9 = (() => {
  const _el$15 = _$getNextElement(_tmpl$3);

  (e => console.log(e))(_el$15);

  return _el$15;
})();

const template10 = (() => {
  const _el$16 = _$getNextElement(_tmpl$3);

  const _ref$3 = refFactory();

  typeof _ref$3 === "function" && _ref$3(_el$16);
  return _el$16;
})();

const template11 = (() => {
  const _el$17 = _$getNextElement(_tmpl$3);

  another(_el$17, () => thing);
  something(_el$17, () => true);
  return _el$17;
})();

const template12 = (() => {
  const _el$18 = _$getNextElement(_tmpl$3);

  _el$18.htmlFor = thing;
  return _el$18;
})();

const template13 = (() => {
  const _el$19 = _$getNextElement(_tmpl$5);

  _el$19.checked = true;
  return _el$19;
})();

const template14 = (() => {
  const _el$20 = _$getNextElement(_tmpl$5);

  _$effect(() => (_el$20.checked = state.visible));

  return _el$20;
})();
