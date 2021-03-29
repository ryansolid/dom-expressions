import { ssrBoolean as _$ssrBoolean } from "r-server";
import { ssrStyle as _$ssrStyle } from "r-server";
import { ssr as _$ssr } from "r-server";
import { escape as _$escape } from "r-server";
import { ssrClassList as _$ssrClassList } from "r-server";
import { ssrSpread as _$ssrSpread } from "r-server";
const _tmpl$ = [
    '<div id="main" ',
    ' class="',
    '" style="',
    '"><h1 ',
    ' disabled="" title="',
    '" style="',
    '" class="',
    '"><a href="/">Welcome</a></h1></div>'
  ],
  _tmpl$2 = ["<div><div>", "</div><div>", "</div><div><div/></div></div>"],
  _tmpl$3 = ['<div id="', '" style="', '" name="', '">', "</div>"],
  _tmpl$4 = ['<div class="', '"></div>'],
  _tmpl$5 = ['<div style="', '">Hi</div>'],
  _tmpl$6 = ['<div style="', '" class="', '"></div>'],
  _tmpl$7 = "<div></div>",
  _tmpl$8 = ['<input type="checkbox"', ">"];

const template = _$ssr(
  _tmpl$,
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
  })
);

const template2 = _$ssr(_tmpl$2, _$escape(rowId), _$escape(row.label));

const template3 = _$ssr(
  _tmpl$3,
  _$escape(state.id, true),
  "background-color:" + _$escape(state.color, true),
  _$escape(state.name, true),
  _$escape(state.content)
);

const template4 = _$ssr(_tmpl$4, `hi ${_$escape(state.class, true) || ""}`);

const template5 = _$ssr(_tmpl$4, `a  b`);

const template6 = _$ssr(_tmpl$5, _$ssrStyle(someStyle()));

const template7 = _$ssr(
  _tmpl$6,
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

const template8 = _$ssr(_tmpl$7);

const template9 = _$ssr(_tmpl$7);

const template10 = _$ssr(_tmpl$7);

const template11 = _$ssr(_tmpl$7);

const template12 = _$ssr(_tmpl$7);

const template13 = _$ssr(_tmpl$8, _$ssrBoolean("checked", true));

const template14 = _$ssr(_tmpl$8, _$ssrBoolean("checked", state.visible));
