import { createComponent as _$createComponent } from "r-server";
import { ssrElement as _$ssrElement } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { ssrStyleProperty as _$ssrStyleProperty } from "r-server";
import { ssrAttribute as _$ssrAttribute } from "r-server";
import { escape as _$escape } from "r-server";
import { ssrClassName as _$ssrClassName } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = [
    "<svg",
    ' width="400" height="180"><rect stroke-width="2" x="50" y="20" rx="20" ry="20" width="150" height="150" style="fill:red;stroke:black;stroke-width:5;opacity:0.5"></rect><linearGradient gradientTransform="rotate(25)"><stop offset="0%"></stop></linearGradient></svg>'
  ],
  _tmpl$2 = [
    "<svg",
    ' width="400" height="180"><rect class="',
    '"',
    "",
    "",
    ' rx="20" ry="20" width="150" height="150" style="',
    '"></rect></svg>'
  ],
  _tmpl$3 = ["<svg", ' width="400" height="180">', "</svg>"],
  _tmpl$4 = ["<rect", ' x="50" y="20" width="150" height="150"></rect>'],
  _tmpl$5 = [
    "<svg",
    ' viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg"><a',
    '><text x="10" y="25">MDN Web Docs</text></a></svg>'
  ],
  _tmpl$6 = [
    "<svg",
    ' viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg"><text x="10" y="25">',
    "</text></svg>"
  ];
const template = (() => {
  var _v$ = _$ssrHydrationKey();
  return _$ssr(_tmpl$, _v$);
})();
const template2 = (() => {
  var _v$2 = _$ssrHydrationKey(),
    _v$3 = _$ssrRunInScope([
      () => _$ssrClassName(state.name),
      () => _$ssrAttribute("stroke-width", _$escape(state.width, true)),
      () => _$ssrAttribute("x", _$escape(state.x, true)),
      () => _$ssrAttribute("y", _$escape(state.y, true)),
      () =>
        _$ssrStyleProperty("fill:", "red") +
        _$ssrStyleProperty(";stroke:", "black") +
        _$ssrStyleProperty(";stroke-width:", _$escape(props.stroke, true)) +
        _$ssrStyleProperty(";opacity:", 0.5)
    ]);
  return _$ssr(_tmpl$2, _v$2, _v$3[0], _v$3[1], _v$3[2], _v$3[3], _v$3[4]);
})();
const template3 = (() => {
  var _v$4 = _$ssrHydrationKey(),
    _v$5 = _$ssrElement("rect", props, undefined, false);
  return _$ssr(_tmpl$3, _v$4, _v$5);
})();
const template4 = (() => {
  var _v$6 = _$ssrHydrationKey();
  return _$ssr(_tmpl$4, _v$6);
})();
const template5 = (() => {
  var _v$7 = _$ssrHydrationKey();
  return _$ssr(_tmpl$4, _v$7);
})();
const template6 = _$createComponent(Component, {
  get children() {
    var _v$8 = _$ssrHydrationKey();
    return _$ssr(_tmpl$4, _v$8);
  }
});
const template7 = (() => {
  var _v$9 = _$ssrHydrationKey();
  return _$ssr(_tmpl$5, _v$9, _$ssrAttribute("xlink:href", _$escape(url, true)));
})();
const template8 = (() => {
  var _v$10 = _$ssrHydrationKey(),
    _v$11 = _$escape(text) || " ";
  return _$ssr(_tmpl$6, _v$10, _v$11);
})();
