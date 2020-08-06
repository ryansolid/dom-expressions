import { createComponent as _$createComponent } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { escape as _$escape } from "r-dom";

const template1 = _$ssr(["<div>", "</div>"], _$escape(simple));

const template2 = _$ssr(["<div>", "</div>"], _$escape(state.dynamic));

const template3 = _$ssr(["<div>", "</div>"], _$escape(simple ? good : bad));

const template4 = _$ssr(["<div>", "</div>"], _$escape(simple ? good() : bad));

const template5 = _$ssr(["<div>", "</div>"], _$escape(state.dynamic ? good() : bad));

const template6 = _$ssr(["<div>", "</div>"], _$escape(state.dynamic && good()));

const template7 = _$ssr(
  ["<div>", "</div>"],
  _$escape(state.count > 5 ? (state.dynamic ? best : good()) : bad)
);

const template8 = _$ssr(["<div>", "</div>"], _$escape(state.dynamic && state.something && good()));

const template9 = _$ssr(["<div>", "</div>"], _$escape((state.dynamic && good()) || bad));

const template10 = _$ssr(
  ["<div>", "</div>"],
  state.a ? "a" : state.b ? "b" : state.c ? "c" : "fallback"
);

const template11 = _$ssr(
  ["<div>", "</div>"],
  _$escape(state.a ? a() : state.b ? b() : state.c ? "c" : "fallback")
);

const template12 = _$createComponent(Comp, {
  render: state.dynamic ? good() : bad
}); // no dynamic predicate

const template13 = _$createComponent(Comp, {
  render: state.dynamic ? good : bad
});

const template14 = _$createComponent(Comp, {
  render: state.dynamic && good()
}); // no dynamic predicate

const template15 = _$createComponent(Comp, {
  render: state.dynamic && good
});

const template16 = _$createComponent(Comp, {
  render: state.dynamic || good()
});
