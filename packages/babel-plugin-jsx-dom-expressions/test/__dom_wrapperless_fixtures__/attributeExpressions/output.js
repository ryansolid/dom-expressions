import { template as _$template } from "r-dom";
import { style as _$style } from "r-dom";
import { classList as _$classList } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { spread as _$spread } from "r-dom";

const _tmpl$ = _$template(
    `<div id="main"><h1 class="base selected" disabled readonly=""><a href="/">Welcome</a></h1></div>`,
    6
  ),
  _tmpl$2 = _$template(`<div><div></div><div></div><div></div></div>`, 8),
  _tmpl$3 = _$template(`<div></div>`, 2),
  _tmpl$4 = _$template(`<div class="a b"></div>`, 2),
  _tmpl$5 = _$template(`<input type="checkbox">`, 1);

const selected = true;

const template = (() => {
  const _el$ = _tmpl$.cloneNode(true),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.firstChild;

  _$spread(_el$, results, false, true);

  _el$.classList.toggle("selected", unknown);

  _el$.style.setProperty("color", color);

  _$spread(_el$2, results, false, true);

  _$setAttribute(_el$2, "title", welcoming());

  _el$2.style.setProperty("background-color", color());

  _el$2.style.setProperty("margin-right", "40px");

  _el$2.classList.toggle("dynamic", dynamic());

  const _ref$ = link;
  typeof _ref$ === "function" ? _ref$(_el$3) : (link = _el$3);

  _$classList(_el$3, {
    "ccc ddd": true
  });

  _el$3.readOnly = value;
  return _el$;
})();

const template2 = (() => {
  const _el$4 = _tmpl$2.cloneNode(true),
    _el$5 = _el$4.firstChild,
    _el$6 = _el$5.nextSibling,
    _el$7 = _el$6.nextSibling;

  _el$5.textContent = rowId;
  _el$6.textContent = row.label;
  _el$7.innerHTML = "<div/>";
  return _el$4;
})();

const template3 = (() => {
  const _el$8 = _tmpl$3.cloneNode(true);

  _$setAttribute(
    _el$8,
    "id",
    /*@once*/
    state.id
  );

  _el$8.style.setProperty(
    "background-color",
    /*@once*/
    state.color
  );

  _$setAttribute(_el$8, "name", state.name);

  _el$8.textContent =
    /*@once*/
    state.content;
  return _el$8;
})();

const template4 = (() => {
  const _el$9 = _tmpl$3.cloneNode(true);

  _el$9.className = `hi ${state.class || ""}`;

  _$classList(_el$9, {
    "ccc:ddd": true
  });

  return _el$9;
})();

const template5 = _tmpl$4.cloneNode(true);

const template6 = (() => {
  const _el$11 = _tmpl$3.cloneNode(true);

  _$style(_el$11, someStyle());

  _el$11.textContent = "Hi";
  return _el$11;
})();

const template7 = (() => {
  const _el$12 = _tmpl$3.cloneNode(true);

  _$style(_el$12, {
    "background-color": color(),
    "margin-right": "40px",
    ...props.style
  });

  _el$12.style.setProperty("padding-top", props.top);

  _el$12.classList.toggle("my-class", props.active);

  return _el$12;
})();

let refTarget;

const template8 = (() => {
  const _el$13 = _tmpl$3.cloneNode(true);

  const _ref$2 = refTarget;
  typeof _ref$2 === "function" ? _ref$2(_el$13) : (refTarget = _el$13);
  return _el$13;
})();

const template9 = (() => {
  const _el$14 = _tmpl$3.cloneNode(true);

  (e => console.log(e))(_el$14);

  return _el$14;
})();

const template10 = (() => {
  const _el$15 = _tmpl$3.cloneNode(true);

  const _ref$3 = refFactory();

  typeof _ref$3 === "function" && _ref$3(_el$15);
  return _el$15;
})();

const template11 = (() => {
  const _el$16 = _tmpl$3.cloneNode(true);

  another(_el$16, () => thing);
  something(_el$16, () => true);
  return _el$16;
})();

const template12 = (() => {
  const _el$17 = _tmpl$3.cloneNode(true);

  _el$17.htmlFor = thing;
  return _el$17;
})();

const template13 = (() => {
  const _el$18 = _tmpl$5.cloneNode(true);

  _el$18.checked = true;
  return _el$18;
})();

const template14 = (() => {
  const _el$19 = _tmpl$5.cloneNode(true);

  _el$19.checked = state.visible;
  return _el$19;
})();
