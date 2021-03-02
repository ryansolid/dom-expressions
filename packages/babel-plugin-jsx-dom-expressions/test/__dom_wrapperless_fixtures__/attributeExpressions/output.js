import { template as _$template } from "r-dom";
import { style as _$style } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { classList as _$classList } from "r-dom";
import { spread as _$spread } from "r-dom";

const _tmpl$ = _$template(`<div id="main"><h1 disabled=""><a href="/">Welcome</a></h1></div>`, 6),
  _tmpl$2 = _$template(`<div><div></div><div></div></div>`, 6),
  _tmpl$3 = _$template(`<div></div>`, 2),
  _tmpl$4 = _$template(`<input type="checkbox">`, 1);

const template = (() => {
  const _el$ = _tmpl$.cloneNode(true),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.firstChild;

  _$spread(_el$, results, false, true);

  _$classList(_el$, {
    selected: selected
  });

  _el$.style.setProperty("color", color);

  _$spread(_el$2, () => results(), false, true);

  _$setAttribute(_el$2, "title", welcoming());

  _el$2.style.setProperty("background-color", color());

  _el$2.style.setProperty("margin-right", "40px");

  _$classList(_el$2, {
    selected: selected()
  });

  const _ref$ = link;
  typeof _ref$ === "function" ? _ref$(_el$3) : (link = _el$3);
  return _el$;
})();

const template2 = (() => {
  const _el$4 = _tmpl$2.cloneNode(true),
    _el$5 = _el$4.firstChild,
    _el$6 = _el$5.nextSibling;

  _el$5.textContent = rowId;
  _el$6.textContent = row.label;
  return _el$4;
})();

const template3 = (() => {
  const _el$7 = _tmpl$3.cloneNode(true);

  _$setAttribute(
    _el$7,
    "id",
    /*@once*/
    state.id
  );

  _el$7.style.setProperty(
    "background-color",
    /*@once*/
    state.color
  );

  _$setAttribute(_el$7, "name", state.name);

  _el$7.textContent =
    /*@once*/
    state.content;
  return _el$7;
})();

const template4 = (() => {
  const _el$8 = _tmpl$3.cloneNode(true);

  _el$8.className = `hi ${state.class || ""}`;
  return _el$8;
})();

const template5 = (() => {
  const _el$9 = _tmpl$3.cloneNode(true);

  _el$9.className = `a  b`;
  return _el$9;
})();

const template6 = (() => {
  const _el$10 = _tmpl$3.cloneNode(true);

  _$style(_el$10, someStyle());

  _el$10.textContent = "Hi";
  return _el$10;
})();

const template7 = (() => {
  const _el$11 = _tmpl$3.cloneNode(true);

  _$style(_el$11, {
    "background-color": color(),
    "margin-right": "40px",
    ...props.style
  });

  _el$11.style.setProperty("padding-top", props.top);

  return _el$11;
})();

let refTarget;

const template8 = (() => {
  const _el$12 = _tmpl$3.cloneNode(true);

  const _ref$2 = refTarget;
  typeof _ref$2 === "function" ? _ref$2(_el$12) : (refTarget = _el$12);
  return _el$12;
})();

const template9 = (() => {
  const _el$13 = _tmpl$3.cloneNode(true);

  (e => console.log(e))(_el$13);

  return _el$13;
})();

const template10 = (() => {
  const _el$14 = _tmpl$3.cloneNode(true);

  const _ref$3 = refFactory();

  typeof _ref$3 === "function" && _ref$3(_el$14);
  return _el$14;
})();

const template11 = (() => {
  const _el$15 = _tmpl$3.cloneNode(true);

  another(_el$15, () => thing);
  something(_el$15, () => true);
  return _el$15;
})();

const template12 = (() => {
  const _el$16 = _tmpl$3.cloneNode(true);

  _el$16.htmlFor = thing;
  return _el$16;
})();

const template13 = (() => {
  const _el$17 = _tmpl$4.cloneNode(true);

  _el$17.checked = true;
  return _el$17;
})();

const template14 = (() => {
  const _el$18 = _tmpl$4.cloneNode(true);

  _el$18.checked = state.visible;
  return _el$18;
})();
