import { escape as _$escape } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { ssrStyle as _$ssrStyle } from "r-dom";
import { ssrClassList as _$ssrClassList } from "r-dom";
import { ssrSpread as _$ssrSpread } from "r-dom";

const template = _$ssr(
  [
    '<div id="main" ',
    ' class="',
    '" style="',
    '"><h1 ',
    ' disabled="" title="',
    '" style="',
    '" class="',
    '"><a href="/">Welcome</a></h1></div>'
  ],
  _$ssrSpread(results, false, true),
  _$ssrClassList({
    selected: selected
  }),
  _$ssrStyle({
    color
  }),
  _$ssrSpread(() => results(), false, true),
  () => welcoming(),
  () =>
    _$ssrStyle({
      "background-color": color()
    }),
  () =>
    _$ssrClassList({
      selected: selected()
    })
);

const template2 = _$ssr(["<div><div>", "</div><div>", "</div></div>"], _$escape(rowId), () =>
  _$escape(row.label)
);

const template3 = _$ssr(
  ['<div id="', '" style="', '" name="', '">', "</div>"],
  state.id,
  _$ssrStyle({
    "background-color": state.color
  }),
  () => state.name,
  _$escape(state.content)
);

const template4 = _$ssr(['<div class="', '"></div>'], () => `hi ${state.class}`);

const template5 = _$ssr(["<div><div>", "</div><div>", "</div></div>"], rowId, () => row.label);
