import { ssrBoolean as _$ssrBoolean } from "r-server";
import { ssrStyle as _$ssrStyle } from "r-server";
import { ssr as _$ssr } from "r-server";
import { escape as _$escape } from "r-server";
import { ssrClassList as _$ssrClassList } from "r-server";
import { ssrSpread as _$ssrSpread } from "r-server";
import { getHydrationKey as _$getHydrationKey } from "r-server";
const _tmpl$ = [
    '<div data-hk="',
    '" id="main" ',
    ' class="',
    '" style="',
    '"><h1 ',
    ' disabled="" title="',
    '" style="',
    '" class="',
    '"><a href="/" class="',
    '">Welcome</a></h1></div>'
  ],
  _tmpl$2 = ['<div data-hk="', '"><div>', "</div><div>", "</div><div><div/></div></div>"],
  _tmpl$3 = ['<div data-hk="', '" id="', '" style="', '" name="', '">', "</div>"],
  _tmpl$4 = ['<div data-hk="', '" class="', '" class="', '"></div>'],
  _tmpl$5 = ['<div data-hk="', '" class="', '"></div>'],
  _tmpl$6 = ['<div data-hk="', '" style="', '">Hi</div>'],
  _tmpl$7 = ['<div data-hk="', '" style="', '" class="', '"></div>'],
  _tmpl$8 = ['<div data-hk="', '"></div>'],
  _tmpl$9 = ['<input data-hk="', '" type="checkbox"', ">"];

const template = _$ssr(
  _tmpl$,
  _$getHydrationKey(),
  _$ssrSpread(results, false, true),
  _$ssrClassList({
    selected: selected
  }),
  "color:" + _$escape(color, true),
  _$ssrSpread(results(), false, true),
  _$escape(welcoming(), true),
  "background-color:" + _$escape(color(), true) + (";margin-right:" + "40px"),
  _$ssrClassList({
    selected: selected()
  }),
  _$ssrClassList({
    "ccc ddd": true
  })
);

const template2 = _$ssr(_tmpl$2, _$getHydrationKey(), _$escape(rowId), _$escape(row.label));

const template3 = _$ssr(
  _tmpl$3,
  _$getHydrationKey(),
  _$escape(state.id, true),
  "background-color:" + _$escape(state.color, true),
  _$escape(state.name, true),
  _$escape(state.content)
);

const template4 = _$ssr(
  _tmpl$4,
  _$getHydrationKey(),
  `hi ${_$escape(state.class, true) || ""}`,
  _$ssrClassList({
    "ccc:ddd": true
  })
);

const template5 = _$ssr(_tmpl$5, _$getHydrationKey(), `a  b`);

const template6 = _$ssr(_tmpl$6, _$getHydrationKey(), _$ssrStyle(someStyle()));

const template7 = _$ssr(
  _tmpl$7,
  _$getHydrationKey(),
  _$ssrStyle({
    "background-color": color(),
    "margin-right": "40px",
    ...props.style,
    "padding-top": props.top
  }),
  _$ssrClassList({
    "my-class": props.active
  })
);

let refTarget;

const template8 = _$ssr(_tmpl$8, _$getHydrationKey());

const template9 = _$ssr(_tmpl$8, _$getHydrationKey());

const template10 = _$ssr(_tmpl$8, _$getHydrationKey());

const template11 = _$ssr(_tmpl$8, _$getHydrationKey());

const template12 = _$ssr(_tmpl$8, _$getHydrationKey());

const template13 = _$ssr(_tmpl$9, _$getHydrationKey(), _$ssrBoolean("checked", true));

const template14 = _$ssr(_tmpl$9, _$getHydrationKey(), _$ssrBoolean("checked", state.visible));
