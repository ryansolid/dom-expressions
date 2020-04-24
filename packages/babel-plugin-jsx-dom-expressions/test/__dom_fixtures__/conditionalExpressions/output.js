import { template as _$template } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { wrapCondition as _$wrapCondition } from "r-dom";
import { insert as _$insert } from "r-dom";

const _tmpl$ = _$template(`<div></div>`, 2);

const _ck$ = ["render"];

const template1 = (() => {
  const _el$ = _tmpl$.cloneNode(true);

  _$insert(_el$, simple);

  return _el$;
})();

const template2 = (() => {
  const _el$2 = _tmpl$.cloneNode(true);

  _$insert(_el$2, () => state.dynamic);

  return _el$2;
})();

const template3 = (() => {
  const _el$3 = _tmpl$.cloneNode(true);

  _$insert(_el$3, simple ? good : bad);

  return _el$3;
})();

const template4 = (() => {
  const _el$4 = _tmpl$.cloneNode(true);

  _$insert(_el$4, () => (simple ? good() : bad));

  return _el$4;
})();

const template5 = (() => {
  const _el$5 = _tmpl$.cloneNode(true);

  _$insert(
    _el$5,
    (() => {
      const _c$ = _$wrapCondition(() => state.dynamic);

      return () => (_c$() ? good() : bad);
    })()
  );

  return _el$5;
})();

const template6 = (() => {
  const _el$6 = _tmpl$.cloneNode(true);

  _$insert(
    _el$6,
    (() => {
      const _c$ = _$wrapCondition(() => state.dynamic);

      return () => _c$() && good();
    })()
  );

  return _el$6;
})();

const template7 = (() => {
  const _el$7 = _tmpl$.cloneNode(true);

  _$insert(
    _el$7,
    (() => {
      const _c$ = _$wrapCondition(() => state.count > 5);

      return () =>
        _c$()
          ? (() => {
              const _c$ = _$wrapCondition(() => state.dynamic);

              return () => (_c$() ? best : good());
            })()
          : bad;
    })()
  );

  return _el$7;
})();

const template8 = (() => {
  const _el$8 = _tmpl$.cloneNode(true);

  _$insert(
    _el$8,
    (() => {
      const _c$ = _$wrapCondition(() => state.dynamic && state.something);

      return () => _c$() && good();
    })()
  );

  return _el$8;
})();

const template9 = (() => {
  const _el$9 = _tmpl$.cloneNode(true);

  _$insert(
    _el$9,
    (() => {
      const _c$ = _$wrapCondition(() => state.dynamic);

      return () => (_c$() && good()) || bad;
    })()
  );

  return _el$9;
})();

const template10 = (() => {
  const _el$10 = _tmpl$.cloneNode(true);

  _$insert(_el$10, () => (state.a ? "a" : state.b ? "b" : state.c ? "c" : "fallback"));

  return _el$10;
})();

const template11 = (() => {
  const _el$11 = _tmpl$.cloneNode(true);

  _$insert(
    _el$11,
    (() => {
      const _c$ = _$wrapCondition(() => state.a);

      return () =>
        _c$()
          ? a()
          : (() => {
              const _c$ = _$wrapCondition(() => state.b);

              return () => (_c$() ? b() : state.c ? "c" : "fallback");
            })();
    })()
  );

  return _el$11;
})();

const template12 = _$createComponent(
  Comp,
  {
    render: (() => {
      const _c$ = _$wrapCondition(() => state.dynamic);

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
      const _c$ = _$wrapCondition(() => state.dynamic);

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
