import { ssrSpread as _$ssrSpread } from "r-dom";
import { escape as _$escape } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";
const _ck$ = ["children"];
const children = _$ssr`<div _hk="${_$getHydrationKey()}"></div>`;
const dynamic = {
  children
};

const template = _$createComponent(Module, {
  children: children
});

const template2 = _$ssr`<module _hk="${_$getHydrationKey()}">${_$escape(children)}</module>`;
const template3 = _$ssr`<module _hk="${_$getHydrationKey()}">Hello</module>`;
const template4 = _$ssr`<module _hk="${_$getHydrationKey()}">${_$createComponent(
  Hello,
  {}
)}</module>`;
const template5 = _$ssr`<module _hk="${_$getHydrationKey()}">${() =>
  _$escape(dynamic.children)}</module>`;

const template6 = _$createComponent(
  Module,
  {
    children: () => dynamic.children
  },
  _ck$
);

const template7 = _$ssr`<module _hk="${_$getHydrationKey()}" ${_$ssrSpread(
  dynamic,
  false,
  false
)}></module>`;
const template8 = _$ssr`<module _hk="${_$getHydrationKey()}" ${_$ssrSpread(
  dynamic,
  false,
  true
)}>Hello</module>`;
const template9 = _$ssr`<module _hk="${_$getHydrationKey()}" ${_$ssrSpread(
  dynamic,
  false,
  true
)}>${() => _$escape(dynamic.children)}</module>`;

const template10 = _$createComponent(
  Module,
  Object.assign(
    Object.keys(dynamic).reduce((m$, k$) => ((m$[k$] = () => dynamic[k$]), m$), {}),
    {
      children: "Hello"
    }
  ),
  Object.keys(dynamic)
);

const template11 = _$ssr`<module _hk="${_$getHydrationKey()}">${_$escape(state.children)}</module>`;

const template12 = _$createComponent(Module, {
  children: state.children
});
