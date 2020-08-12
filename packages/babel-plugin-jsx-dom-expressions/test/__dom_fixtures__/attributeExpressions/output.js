import { template as _$template } from "r-dom";
import { style as _$style } from "r-dom";
import { effect as _$effect } from "r-dom";
import { classList as _$classList } from "r-dom";
import { spread as _$spread } from "r-dom";

const _tmpl$ = _$template(
    `<div id="main"><h1 disabled=""><a href="/">Welcome</a><a href="/">Welcome 2</a></h1></div>`,
    8
  ),
  _tmpl$2 = _$template(`<div><div></div><div></div></div>`, 6),
  _tmpl$3 = _$template(`<div></div>`, 2);

const template = (() => {
  const _el$ = _tmpl$.cloneNode(true),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.firstChild,
    _el$4 = _el$3.nextSibling;

  _$spread(_el$, results, false, true);

  _$classList(_el$, {
    selected: selected
  });

  _el$.style.setProperty("color", color);

  _$spread(_el$2, () => results(), false, true);

  _el$2.style.setProperty("margin-right", "40px");

  typeof link === "function" ? link(_el$3) : (link = _el$3);

  const _ref$ = link2();

  typeof _ref$ === "function" && _ref$(_el$4);

  _$effect(
    _p$ => {
      const _v$ = welcoming(),
        _v$2 = color(),
        _v$3 = {
          selected: selected()
        };

      _v$ !== _p$._v$ && (_el$2.title = _p$._v$ = _v$);
      _v$2 !== _p$._v$2 && _el$2.style.setProperty("background-color", (_p$._v$2 = _v$2));
      _p$._v$3 = _$classList(_el$2, _v$3, _p$._v$3);
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
  const _el$5 = _tmpl$2.cloneNode(true),
    _el$6 = _el$5.firstChild,
    _el$7 = _el$6.nextSibling;

  _el$6.textContent = rowId;
  _el$7.textContent = row.label;
  const _el$8 = _el$7.firstChild;

  _$effect(() => (_el$8.data = row.label));

  return _el$5;
})();

const template3 = (() => {
  const _el$9 = _tmpl$3.cloneNode(true);

  _el$9.id = state.id;

  _el$9.style.setProperty("background-color", state.color);

  _el$9.textContent = state.content;

  _$effect(() => (_el$9.name = state.name));

  return _el$9;
})();

const template4 = (() => {
  const _el$10 = _tmpl$3.cloneNode(true);

  _$effect(() => (_el$10.className = `hi ${state.class}`));

  return _el$10;
})();

const template5 = (() => {
  const _el$11 = _tmpl$3.cloneNode(true);

  _$effect(_$p => _$style(_el$11, someStyle(), _$p));

  return _el$11;
})();

const template6 = (() => {
  const _el$12 = _tmpl$3.cloneNode(true);

  _$effect(_$p =>
    _$style(
      _el$12,
      {
        "background-color": color(),
        "margin-right": "40px",
        ...props.style
      },
      _$p
    )
  );

  return _el$12;
})();

let refTarget;

const template7 = (() => {
  const _el$13 = _tmpl$3.cloneNode(true);

  typeof refTarget === "function" ? refTarget(_el$13) : (refTarget = _el$13);
  return _el$13;
})();

const template8 = (() => {
  const _el$14 = _tmpl$3.cloneNode(true);

  (e => console.log(e))(_el$14);

  return _el$14;
})();
