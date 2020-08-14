import { ssrStyle as _$ssrStyle } from "r-dom";
import { ssrAsync as _$ssrAsync } from "r-dom";
import { escape as _$escape } from "r-dom";
import { ssrClassList as _$ssrClassList } from "r-dom";
import { ssrSpread as _$ssrSpread } from "r-dom";

const template = _$ssrAsync(
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
  "color:" + _$escape(color, true),
  _$ssrSpread(() => results(), false, true),
  () => _$escape(welcoming(), true),
  () => "background-color:" + _$escape(color(), true) + (";margin-right:" + "40px"),
  () =>
    _$ssrClassList({
      selected: selected()
    })
);

const template2 = _$ssrAsync(["<div><div>", "</div><div>", "</div></div>"], _$escape(rowId), () =>
  _$escape(row.label)
);

const template3 = _$ssrAsync(
  ['<div id="', '" style="', '" name="', '">', "</div>"],
  _$escape(state.id, true),
  "background-color:" + _$escape(state.color, true),
  () => _$escape(state.name, true),
  _$escape(state.content)
);

const template4 = _$ssrAsync(
  ['<div class="', '"></div>'],
  () => `hi ${_$escape(state.class, true)}`
);

const template5 = _$ssrAsync(['<div style="', '"></div>'], () => _$ssrStyle(someStyle()));

const template6 = _$ssrAsync(['<div style="', '"></div>'], () =>
  _$ssrStyle({
    "background-color": color(),
    "margin-right": "40px",
    ...props.style
  })
);

let refTarget;

const template7 = _$ssrAsync("<div></div>");

const template8 = _$ssrAsync("<div></div>");
