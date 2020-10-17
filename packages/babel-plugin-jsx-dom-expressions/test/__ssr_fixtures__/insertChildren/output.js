import { assignProps as _$assignProps } from "r-dom";
import { dynamicProperty as _$dynamicProperty } from "r-dom";
import { ssrSpread as _$ssrSpread } from "r-dom";
import { escape as _$escape } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { ssr as _$ssr } from "r-dom";

const children = _$ssr("<div></div>");

const dynamic = {
  children
};

const template = _$createComponent(Module, {
  children: children
});

const template2 = _$ssr(["<module>", "</module>"], _$escape(children));

const template3 = _$ssr("<module>Hello</module>");

const template4 = _$ssr(["<module>", "</module>"], _$createComponent(Hello, {}));

const template5 = _$ssr(["<module>", "</module>"], _$escape(dynamic.children));

const template6 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});

const template7 = _$ssr(["<module ", "></module>"], _$ssrSpread(dynamic, false, false));

const template8 = _$ssr(["<module ", ">Hello</module>"], _$ssrSpread(dynamic, false, true));

const template9 = _$ssr(
  ["<module ", ">", "</module>"],
  _$ssrSpread(dynamic, false, true),
  _$escape(dynamic.children)
);

const template10 = _$createComponent(
  Module,
  _$assignProps(
    Object.keys(dynamic).reduce(
      (m$, k$) => ((m$[k$] = () => dynamic[k$]), _$dynamicProperty(m$, k$)),
      {}
    ),
    {
      children: "Hello"
    }
  )
);

const template11 = _$ssr(["<module>", "</module>"], _$escape(state.children));

const template12 = _$createComponent(Module, {
  children: state.children
});

const template13 = _$ssr(["<module>", "</module>"], _$escape(children));

const template14 = _$createComponent(Module, {
  children: children
});

const template15 = _$ssr(["<module>", "</module>"], _$escape(dynamic.children));

const template16 = _$createComponent(Module, {
  get children() {
    return dynamic.children;
  }
});

const template18 = _$ssr(["<module>Hi ", "</module>"], _$escape(children));

const template19 = _$createComponent(Module, {
  get children() {
    return ["Hi ", children];
  }
});
