import { createComponent as _$createComponent } from "r-server";
import { memo as _$memo } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { ssrAttribute as _$ssrAttribute } from "r-server";
import { escape as _$escape } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = ["<div", ">First</div>"],
  _tmpl$2 = ["<div", ">Last</div>"],
  _tmpl$3 = ["<div", "", ">First</div>"],
  _tmpl$4 = ["<div", "", ">Last</div>"],
  _tmpl$5 = ["<div", "></div>"],
  _tmpl$6 = ["<span", ">1</span>"],
  _tmpl$7 = ["<span", ">2</span>"],
  _tmpl$8 = ["<span", ">3</span>"];
const multiStatic = [
  (() => {
    var _v$ = _$ssrHydrationKey();
    return _$ssr(_tmpl$, _v$);
  })(),
  (() => {
    var _v$2 = _$ssrHydrationKey();
    return _$ssr(_tmpl$2, _v$2);
  })()
];
const multiExpression = [
  (() => {
    var _v$3 = _$ssrHydrationKey();
    return _$ssr(_tmpl$, _v$3);
  })(),
  inserted,
  (() => {
    var _v$4 = _$ssrHydrationKey();
    return _$ssr(_tmpl$2, _v$4);
  })(),
  "After"
];
const multiDynamic = [
  (() => {
    var _v$5 = _$ssrHydrationKey(),
      _v$6 = _$ssrRunInScope([() => _$ssrAttribute("id", _$escape(state.first, true))]);
    return _$ssr(_tmpl$3, _v$5, _v$6[0]);
  })(),
  _$memo(() => _$escape(state.inserted)),
  (() => {
    var _v$7 = _$ssrHydrationKey(),
      _v$8 = _$ssrRunInScope([() => _$ssrAttribute("id", _$escape(state.last, true))]);
    return _$ssr(_tmpl$4, _v$7, _v$8[0]);
  })(),
  "After"
];
const singleExpression = inserted;
const singleDynamic = _$memo(() => _$escape(inserted()));
const firstStatic = [
  inserted,
  (() => {
    var _v$9 = _$ssrHydrationKey();
    return _$ssr(_tmpl$5, _v$9);
  })()
];
const firstDynamic = [
  _$memo(() => _$escape(inserted())),
  (() => {
    var _v$10 = _$ssrHydrationKey();
    return _$ssr(_tmpl$5, _v$10);
  })()
];
const firstComponent = [
  _$createComponent(Component, {}),
  (() => {
    var _v$11 = _$ssrHydrationKey();
    return _$ssr(_tmpl$5, _v$11);
  })()
];
const lastStatic = [
  (() => {
    var _v$12 = _$ssrHydrationKey();
    return _$ssr(_tmpl$5, _v$12);
  })(),
  inserted
];
const lastDynamic = [
  (() => {
    var _v$13 = _$ssrHydrationKey();
    return _$ssr(_tmpl$5, _v$13);
  })(),
  _$memo(() => _$escape(inserted()))
];
const lastComponent = [
  (() => {
    var _v$14 = _$ssrHydrationKey();
    return _$ssr(_tmpl$5, _v$14);
  })(),
  _$createComponent(Component, {})
];
const spaces = [
  (() => {
    var _v$15 = _$ssrHydrationKey();
    return _$ssr(_tmpl$6, _v$15);
  })(),
  " ",
  (() => {
    var _v$16 = _$ssrHydrationKey();
    return _$ssr(_tmpl$7, _v$16);
  })(),
  " ",
  (() => {
    var _v$17 = _$ssrHydrationKey();
    return _$ssr(_tmpl$8, _v$17);
  })()
];
const multiLineTrailing = [
  (() => {
    var _v$18 = _$ssrHydrationKey();
    return _$ssr(_tmpl$6, _v$18);
  })(),
  (() => {
    var _v$19 = _$ssrHydrationKey();
    return _$ssr(_tmpl$7, _v$19);
  })(),
  (() => {
    var _v$20 = _$ssrHydrationKey();
    return _$ssr(_tmpl$8, _v$20);
  })()
];
