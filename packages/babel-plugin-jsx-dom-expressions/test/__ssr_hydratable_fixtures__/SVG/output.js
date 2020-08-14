import { createComponent as _$createComponent } from "r-dom";
import { ssrSpread as _$ssrSpread } from "r-dom";
import { escape as _$escape } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";
const _ck$ = ["children"];

const template = _$ssr(
  [
    '<svg _hk="',
    '" width="400" height="180"><rect stroke-width="2" x="50" y="20" rx="20" ry="20" width="150" height="150" style="fill:red;stroke:black;stroke-width:5;opacity:0.5"></rect><linearGradient gradientTransform="rotate(25)"><stop offset="0%"></stop></linearGradient></svg>'
  ],
  _$getHydrationKey()
);

const template2 = _$ssr(
  [
    '<svg _hk="',
    '" width="400" height="180"><rect class="',
    '" stroke-width="',
    '" x="',
    '" y="',
    '" rx="20" ry="20" width="150" height="150" style="',
    '"></rect></svg>'
  ],
  _$getHydrationKey(),
  _$escape(state.name, true),
  _$escape(state.width, true),
  _$escape(state.x, true),
  _$escape(state.y, true),
  "fill:" +
    "red" +
    (";stroke:" + "black") +
    (";stroke-width:" + _$escape(props.stroke, true)) +
    (";opacity:" + 0.5)
);

const template3 = _$ssr(
  ['<svg _hk="', '" width="400" height="180"><rect ', "></rect></svg>"],
  _$getHydrationKey(),
  _$ssrSpread(props, true, false)
);

const template4 = _$ssr(
  ['<rect _hk="', '" x="50" y="20" width="150" height="150"></rect>'],
  _$getHydrationKey()
);

const template5 = _$ssr(
  ['<rect _hk="', '" x="50" y="20" width="150" height="150"></rect>'],
  _$getHydrationKey()
);

const template6 = _$createComponent(
  Component,
  {
    children: () =>
      _$ssr(
        ['<rect _hk="', '" x="50" y="20" width="150" height="150"></rect>'],
        _$getHydrationKey()
      )
  },
  _ck$
);
