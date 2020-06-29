import { createComponent as _$createComponent } from "r-dom";
import { memo as _$memo } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { escape as _$escape } from "r-dom";
const _ck$ = ["render"];

const template1 = _$ssr(["<div>", "</div>"], _$escape(simple));

const template2 = _$ssr(["<div>", "</div>"], () => _$escape(state.dynamic));

const template3 = _$ssr(["<div>", "</div>"], _$escape(simple ? good : bad));

const template4 = _$ssr(["<div>", "</div>"], () => _$escape(simple ? good() : bad));

const template5 = _$ssr(
  ["<div>", "</div>"],
  (() => {
    const _c$ = _$memo(() => !!state.dynamic, true);

    return () => (_c$() ? good() : bad);
  })()
);

const template6 = _$ssr(
  ["<div>", "</div>"],
  (() => {
    const _c$ = _$memo(() => !!state.dynamic, true);

    return () => _c$() && good();
  })()
);

const template7 = _$ssr(
  ["<div>", "</div>"],
  (() => {
    const _c$ = _$memo(() => state.count > 5, true);

    return () =>
      _c$()
        ? (() => {
            const _c$ = _$memo(() => !!state.dynamic, true);

            return () => (_c$() ? best : good());
          })()
        : bad;
  })()
);

const template8 = _$ssr(
  ["<div>", "</div>"],
  (() => {
    const _c$ = _$memo(() => !!(state.dynamic && state.something), true);

    return () => _c$() && good();
  })()
);

const template9 = _$ssr(
  ["<div>", "</div>"],
  (() => {
    const _c$ = _$memo(() => state.dynamic, true);

    return () => (_c$() && good()) || bad;
  })()
);

const template10 = _$ssr(["<div>", "</div>"], () =>
  _$escape(state.a ? "a" : state.b ? "b" : state.c ? "c" : "fallback")
);

const template11 = _$ssr(
  ["<div>", "</div>"],
  (() => {
    const _c$ = _$memo(() => !!state.a, true);

    return () =>
      _c$()
        ? a()
        : (() => {
            const _c$ = _$memo(() => !!state.b, true);

            return () => (_c$() ? b() : state.c ? "c" : "fallback");
          })();
  })()
);

const template12 = _$createComponent(
  Comp,
  {
    render: (() => {
      const _c$ = _$memo(() => !!state.dynamic, true);

      return () => (_c$() ? good() : bad);
    })()
  },
  _ck$
); // no dynamic predicate

const template13 = _$createComponent(
  Comp,
  {
    render: () => (state.dynamic ? good : bad)
  },
  _ck$
);

const template14 = _$createComponent(
  Comp,
  {
    render: (() => {
      const _c$ = _$memo(() => !!state.dynamic, true);

      return () => _c$() && good();
    })()
  },
  _ck$
); // no dynamic predicate

const template15 = _$createComponent(
  Comp,
  {
    render: () => state.dynamic && good
  },
  _ck$
);

const template16 = _$createComponent(
  Comp,
  {
    render: (() => {
      const _c$ = _$memo(() => state.dynamic, true);

      return () => _c$() || good();
    })()
  },
  _ck$
);
