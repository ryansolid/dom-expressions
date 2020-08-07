import { ssrSpread as _$ssrSpread } from "r-dom";
import { escape as _$escape } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { ssrStream as _$ssrStream } from "r-dom";
const _ck$ = ["children"];

const children = _$ssrStream("<div></div>");

const dynamic = {
  children
};

const template = _$createComponent(Module, {
  children: children
});

const template2 = _$ssrStream(["<module>", "</module>"], _$escape(children));

const template3 = _$ssrStream("<module>Hello</module>");

const template4 = _$ssrStream(["<module>", "</module>"], _$createComponent(Hello, {}));

const template5 = _$ssrStream(["<module>", "</module>"], _$escape(dynamic.children));

const template6 = _$createComponent(Module, {
  children: dynamic.children
});

const template7 = _$ssrStream(["<module ", "></module>"], _$ssrSpread(dynamic, false, false));

const template8 = _$ssrStream(["<module ", ">Hello</module>"], _$ssrSpread(dynamic, false, true));

const template9 = _$ssrStream(
  ["<module ", ">", "</module>"],
  _$ssrSpread(dynamic, false, true),
  _$escape(dynamic.children)
);

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

const template11 = _$ssrStream(["<module>", "</module>"], _$escape(state.children));

const template12 = _$createComponent(Module, {
  children: state.children
});

const template13 = _$ssrStream(["<module>", "</module>"], _$escape(children));

const template14 = _$createComponent(Module, {
  children: children
});

const template15 = _$ssrStream(["<module>", "</module>"], _$escape(dynamic.children));

const template16 = _$createComponent(Module, {
  children: dynamic.children
});

const template18 = _$ssrStream(["<module>Hi ", "</module>"], _$escape(children));

const template19 = _$createComponent(
  Module,
  {
    children: () => ["Hi ", children]
  },
  _ck$
);
