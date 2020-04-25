import { ssr as _$ssr } from "r-dom";
import { ssrStyle as _$ssrStyle } from "r-dom";
import { ssrClassList as _$ssrClassList } from "r-dom";
import { ssrSpread as _$ssrSpread } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";
const template = _$ssr`<div _hk="${_$getHydrationKey()}" id="main" ${_$ssrSpread(
  results,
  false,
  true
)} class="${_$ssrClassList({
  selected: selected
})}" style="${_$ssrStyle({
  color
})}"><h1 ${_$ssrSpread(() => results(), false, true)} disabled="" title="${() =>
  welcoming()}" style="${() =>
  _$ssrStyle({
    "background-color": color()
  })}" class="${() =>
  _$ssrClassList({
    selected: selected()
  })}"><a href="/">Welcome</a></h1></div>`;
const template2 = _$ssr`<div _hk="${_$getHydrationKey()}"><div>${rowId}</div><div>${() =>
  row.label}</div></div>`;
const template3 = _$ssr`<div _hk="${_$getHydrationKey()}" id="${state.id}" style="${_$ssrStyle({
  "background-color": state.color
})}" name="${() => state.name}">${state.content}</div>`;
const template4 = _$ssr`<div _hk="${_$getHydrationKey()}" class="${() =>
  `hi ${state.class}`}"></div>`;
