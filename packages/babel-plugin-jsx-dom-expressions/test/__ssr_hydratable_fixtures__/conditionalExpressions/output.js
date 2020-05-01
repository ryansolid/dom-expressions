import { createComponent as _$createComponent } from "r-dom";
import { memo as _$memo } from "r-dom";
import { ssr as _$ssr } from "r-dom";
import { escape as _$escape } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";
const _ck$ = ["render"];
const template1 = _$ssr`<div _hk="${_$getHydrationKey()}">${_$escape(simple)}</div>`;
const template2 = _$ssr`<div _hk="${_$getHydrationKey()}">${() => _$escape(state.dynamic)}</div>`;
const template3 = _$ssr`<div _hk="${_$getHydrationKey()}">${_$escape(simple ? good : bad)}</div>`;
const template4 = _$ssr`<div _hk="${_$getHydrationKey()}">${() =>
  _$escape(simple ? good() : bad)}</div>`;
const template5 = _$ssr`<div _hk="${_$getHydrationKey()}">${(() => {
  const _c$ = _$memo(() => state.dynamic, true);

  return () => (_c$() ? good() : bad);
})()}</div>`;
const template6 = _$ssr`<div _hk="${_$getHydrationKey()}">${(() => {
  const _c$ = _$memo(() => state.dynamic, true);

  return () => _c$() && good();
})()}</div>`;
const template7 = _$ssr`<div _hk="${_$getHydrationKey()}">${(() => {
  const _c$ = _$memo(() => state.count > 5, true);

  return () =>
    _c$()
      ? (() => {
          const _c$ = _$memo(() => state.dynamic, true);

          return () => (_c$() ? best : good());
        })()
      : bad;
})()}</div>`;
const template8 = _$ssr`<div _hk="${_$getHydrationKey()}">${(() => {
  const _c$ = _$memo(() => state.dynamic && state.something, true);

  return () => _c$() && good();
})()}</div>`;
const template9 = _$ssr`<div _hk="${_$getHydrationKey()}">${(() => {
  const _c$ = _$memo(() => state.dynamic, true);

  return () => (_c$() && good()) || bad;
})()}</div>`;
const template10 = _$ssr`<div _hk="${_$getHydrationKey()}">${() =>
  _$escape(state.a ? "a" : state.b ? "b" : state.c ? "c" : "fallback")}</div>`;
const template11 = _$ssr`<div _hk="${_$getHydrationKey()}">${(() => {
  const _c$ = _$memo(() => state.a, true);

  return () =>
    _c$()
      ? a()
      : (() => {
          const _c$ = _$memo(() => state.b, true);

          return () => (_c$() ? b() : state.c ? "c" : "fallback");
        })();
})()}</div>`;

const template12 = _$createComponent(
  Comp,
  {
    render: (() => {
      const _c$ = _$memo(() => state.dynamic, true);

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
      const _c$ = _$memo(() => state.dynamic, true);

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
