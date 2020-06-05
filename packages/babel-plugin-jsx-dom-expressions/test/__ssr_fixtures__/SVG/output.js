import { createComponent as _$createComponent } from "r-dom";
import { ssrSpread as _$ssrSpread } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { ssrStyle as _$ssrStyle } from "r-dom";
const _ck$ = ["children"];
const template =
  '<svg width="400" height="180"><rect stroke-width="2" x="50" y="20" rx="20" ry="20" width="150" height="150" style="fill:red;stroke:black;stroke-width:5;opacity:0.5"></rect><linearGradient gradientTransform="rotate(25)"><stop offset="0%"></stop></linearGradient></svg>';

const template2 = _$ssr(
  [
    '<svg width="400" height="180"><rect class="',
    '" stroke-width="',
    '" x="',
    '" y="',
    '" rx="20" ry="20" width="150" height="150" style="',
    '"></rect></svg>'
  ],
  () => state.name,
  () => state.width,
  () => state.x,
  () => state.y,
  () =>
    _$ssrStyle({
      fill: "red",
      stroke: "black",
      "stroke-width": props.stroke,
      opacity: 0.5
    })
);

const template3 = _$ssr(
  ['<svg width="400" height="180"><rect ', "></rect></svg>"],
  _$ssrSpread(props, true, false)
);

const template4 = '<rect x="50" y="20" width="150" height="150"></rect>';
const template5 = '<rect x="50" y="20" width="150" height="150"></rect>';

const template6 = _$createComponent(
  Component,
  {
    children: () => '<rect x="50" y="20" width="150" height="150"></rect>'
  },
  _ck$
);
