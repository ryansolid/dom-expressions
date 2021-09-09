import { ssrStyle as _$ssrStyle } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrBoolean as _$ssrBoolean } from "r-server";
import { escape as _$escape } from "r-server";
import { ssrSpread as _$ssrSpread } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
const _tmpl$ = [
    "<div",
    ' id="main" ',
    ' class="',
    '" style="',
    '"><h1 class="',
    '" ',
    ' disabled readonly="" title="',
    '" style="',
    '"><a href="/" class="',
    '"',
    ">Welcome</a></h1></div>"
  ],
  _tmpl$2 = ["<div", "><div>", "</div><div>", "</div><div><div/></div></div>"],
  _tmpl$3 = ["<div", ' id="', '" style="', '" name="', '">', "</div>"],
  _tmpl$4 = ["<div", ' class="', '"></div>'],
  _tmpl$5 = ["<div", ' style="', '">Hi</div>'],
  _tmpl$6 = ["<div", ' style="', '" class="', '"></div>'],
  _tmpl$7 = ["<div", "></div>"],
  _tmpl$8 = ["<input", ' type="checkbox"', ">"];
const selected = true;

const template = _$ssr(
  _tmpl$,
  _$ssrHydrationKey(),
  _$ssrSpread(results, false, true),
  unknown ? "selected" : "",
  "color:" + _$escape(color, true),
  `base ${dynamic() ? "dynamic" : ""} ${selected ? "selected" : ""}`,
  _$ssrSpread(results(), false, true),
  _$escape(welcoming(), true),
  "background-color:" + _$escape(color(), true) + (";margin-right:" + "40px"),
  "ccc ddd",
  _$ssrBoolean("readonly", value)
);

const template2 = _$ssr(_tmpl$2, _$ssrHydrationKey(), _$escape(rowId), _$escape(row.label));

const template3 = _$ssr(
  _tmpl$3,
  _$ssrHydrationKey(),
  _$escape(state.id, true),
  "background-color:" + _$escape(state.color, true),
  _$escape(state.name, true),
  _$escape(state.content)
);

const template4 = _$ssr(
  _tmpl$4,
  _$ssrHydrationKey(),
  `hi ${_$escape(state.class, true) || ""} ccc:ddd`
);

const template5 = _$ssr(_tmpl$4, _$ssrHydrationKey(), `a  b`);

const template6 = _$ssr(_tmpl$5, _$ssrHydrationKey(), _$ssrStyle(someStyle()));

const template7 = _$ssr(
  _tmpl$6,
  _$ssrHydrationKey(),
  _$ssrStyle({
    "background-color": color(),
    "margin-right": "40px",
    ...props.style,
    "padding-top": props.top
  }),
  props.active ? "my-class" : ""
);

let refTarget;

const template8 = _$ssr(_tmpl$7, _$ssrHydrationKey());

const template9 = _$ssr(_tmpl$7, _$ssrHydrationKey());

const template10 = _$ssr(_tmpl$7, _$ssrHydrationKey());

const template11 = _$ssr(_tmpl$7, _$ssrHydrationKey());

const template12 = _$ssr(_tmpl$7, _$ssrHydrationKey());

const template13 = _$ssr(_tmpl$8, _$ssrHydrationKey(), _$ssrBoolean("checked", true));

const template14 = _$ssr(_tmpl$8, _$ssrHydrationKey(), _$ssrBoolean("checked", state.visible));
