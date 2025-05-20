import { ssr as _$ssr } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = [
    "<div",
    ' id="main"><style>div { color: red; }</style><h1>Welcome</h1><label for="entry">Edit:</label><input id="entry" type="text"></div>'
  ],
  _tmpl$2 = ["<div", "><span><a></a></span><span></span></div>"],
  _tmpl$3 = ["<div", "><div><table><tbody></tbody></table></div><div></div></div>"],
  _tmpl$4 = [
    "<div",
    "><div><footer><div></div></footer></div><div><button><span>0</span></button></div></div>"
  ],
  _tmpl$5 = ["<div", "><noscript>No JS!!<style>div { color: red; }</style></noscript></div>"];
const template = (() => {
  var _v$ = _$ssrHydrationKey();
  return _$ssr(_tmpl$, _v$);
})();
const template2 = (() => {
  var _v$2 = _$ssrHydrationKey();
  return _$ssr(_tmpl$2, _v$2);
})();
const template3 = (() => {
  var _v$3 = _$ssrHydrationKey();
  return _$ssr(_tmpl$3, _v$3);
})();
const template4 = (() => {
  var _v$4 = _$ssrHydrationKey();
  return _$ssr(_tmpl$4, _v$4);
})();
const template5 = (() => {
  var _v$5 = _$ssrHydrationKey();
  return _$ssr(_tmpl$5, _v$5);
})();
