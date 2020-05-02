import { ssrSpread as _$ssrSpread } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { escape as _$escape } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
const _ck$ = ["children"];
const children = "<div></div>";
const dynamic = {
  children
};

const template = _$createComponent(Module, {
  children: children
});

const template2 = _$ssr`<module>${_$escape(children)}</module>`;
const template3 = "<module>Hello</module>";
const template4 = _$ssr`<module>${_$createComponent(Hello, {})}</module>`;
const template5 = _$ssr`<module>${() => _$escape(dynamic.children)}</module>`;

const template6 = _$createComponent(
  Module,
  {
    children: () => dynamic.children
  },
  _ck$
);

const template7 = _$ssr`<module ${_$ssrSpread(dynamic, false, false)}></module>`;
const template8 = _$ssr`<module ${_$ssrSpread(dynamic, false, true)}>Hello</module>`;
const template9 = _$ssr`<module ${_$ssrSpread(dynamic, false, true)}>${() =>
  _$escape(dynamic.children)}</module>`;

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

const template11 = _$ssr`<module>${_$escape(state.children)}</module>`;

const template12 = _$createComponent(Module, {
  children: state.children
});

const template13 = _$ssr`<module>${_$escape(children)}</module>`;

const template14 = _$createComponent(Module, {
  children: children
});

const template15 = _$ssr`<module>${() => _$escape(dynamic.children)}</module>`;

const template16 = _$createComponent(
  Module,
  {
    children: () => dynamic.children
  },
  _ck$
);

const template18 = _$ssr`<module>Hi ${_$escape(children)}</module>`;

const template19 = _$createComponent(
  Module,
  {
    children: () => ["Hi ", children]
  },
  _ck$
);
