import { template as _$template } from "r-dom";
import { setProperty as _$setProperty } from "r-dom";
import { effect as _$effect } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { memo as _$memo } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { insert as _$insert } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$2 = /*#__PURE__*/ _$template(`<div>Output`);
const template1 = (() => {
  var _el$ = _$getNextElement(_tmpl$);
  _$insert(_el$, simple);
  return _el$;
})();
const template2 = (() => {
  var _el$2 = _$getNextElement(_tmpl$);
  _$insert(_el$2, () => state.dynamic);
  return _el$2;
})();
const template3 = (() => {
  var _el$3 = _$getNextElement(_tmpl$);
  _$insert(_el$3, simple ? good : bad);
  return _el$3;
})();
const template4 = (() => {
  var _el$4 = _$getNextElement(_tmpl$);
  _$insert(_el$4, () => (simple ? good() : bad));
  return _el$4;
})();
const template4a = (() => {
  var _el$5 = _$getNextElement(_tmpl$);
  _$insert(_el$5, () => (simple ? good.good : bad));
  return _el$5;
})();
const template5 = (() => {
  var _el$6 = _$getNextElement(_tmpl$);
  _$insert(
    _el$6,
    (() => {
      var _c$ = _$memo(() => !!state.dynamic);
      return () => (_c$() ? good() : bad);
    })()
  );
  return _el$6;
})();
const template5a = (() => {
  var _el$7 = _$getNextElement(_tmpl$);
  _$insert(
    _el$7,
    (() => {
      var _c$2 = _$memo(() => !!state.dynamic);
      return () => (_c$2() ? good.good : bad);
    })()
  );
  return _el$7;
})();
const template6 = (() => {
  var _el$8 = _$getNextElement(_tmpl$);
  _$insert(
    _el$8,
    (() => {
      var _c$3 = _$memo(() => !!state.dynamic);
      return () => _c$3() && good();
    })()
  );
  return _el$8;
})();
const template6a = (() => {
  var _el$9 = _$getNextElement(_tmpl$);
  _$insert(
    _el$9,
    (() => {
      var _c$4 = _$memo(() => !!state.dynamic);
      return () => _c$4() && good.good;
    })()
  );
  return _el$9;
})();
const template7 = (() => {
  var _el$10 = _$getNextElement(_tmpl$);
  _$insert(
    _el$10,
    (() => {
      var _c$5 = _$memo(() => state.count > 5);
      return () => (_c$5() ? (_$memo(() => !!state.dynamic)() ? best : good()) : bad);
    })()
  );
  return _el$10;
})();
const template7a = (() => {
  var _el$11 = _$getNextElement(_tmpl$);
  _$insert(
    _el$11,
    (() => {
      var _c$6 = _$memo(() => state.count > 5);
      return () => (_c$6() ? (_$memo(() => !!state.dynamic)() ? best : good.good) : bad);
    })()
  );
  return _el$11;
})();
const template8 = (() => {
  var _el$12 = _$getNextElement(_tmpl$);
  _$insert(
    _el$12,
    (() => {
      var _c$7 = _$memo(() => !!(state.dynamic && state.something));
      return () => _c$7() && good();
    })()
  );
  return _el$12;
})();
const template8a = (() => {
  var _el$13 = _$getNextElement(_tmpl$);
  _$insert(
    _el$13,
    (() => {
      var _c$8 = _$memo(() => !!(state.dynamic && state.something));
      return () => _c$8() && good.good;
    })()
  );
  return _el$13;
})();
const template9 = (() => {
  var _el$14 = _$getNextElement(_tmpl$);
  _$insert(
    _el$14,
    (() => {
      var _c$9 = _$memo(() => !!state.dynamic);
      return () => (_c$9() && good()) || bad;
    })()
  );
  return _el$14;
})();
const template9a = (() => {
  var _el$15 = _$getNextElement(_tmpl$);
  _$insert(
    _el$15,
    (() => {
      var _c$10 = _$memo(() => !!state.dynamic);
      return () => (_c$10() && good.good) || bad;
    })()
  );
  return _el$15;
})();
const template10 = (() => {
  var _el$16 = _$getNextElement(_tmpl$);
  _$insert(
    _el$16,
    (() => {
      var _c$11 = _$memo(() => !!state.a);
      return () => (_c$11() ? "a" : _$memo(() => !!state.b)() ? "b" : state.c ? "c" : "fallback");
    })()
  );
  return _el$16;
})();
const template11 = (() => {
  var _el$17 = _$getNextElement(_tmpl$);
  _$insert(
    _el$17,
    (() => {
      var _c$12 = _$memo(() => !!state.a);
      return () => (_c$12() ? a() : _$memo(() => !!state.b)() ? b() : state.c ? "c" : "fallback");
    })()
  );
  return _el$17;
})();
const template11a = (() => {
  var _el$18 = _$getNextElement(_tmpl$);
  _$insert(
    _el$18,
    (() => {
      var _c$13 = _$memo(() => !!state.a);
      return () => (_c$13() ? a.a : _$memo(() => !!state.b)() ? b.b : state.c ? "c" : "fallback");
    })()
  );
  return _el$18;
})();
const template12 = _$createComponent(Comp, {
  get render() {
    return _$memo(() => !!state.dynamic)() ? good() : bad;
  }
});
const template12a = _$createComponent(Comp, {
  get render() {
    return _$memo(() => !!state.dynamic)() ? good.goood : bad;
  }
});

// no dynamic predicate
const template13 = _$createComponent(Comp, {
  get render() {
    return state.dynamic ? good : bad;
  }
});
const template14 = _$createComponent(Comp, {
  get render() {
    return _$memo(() => !!state.dynamic)() && good();
  }
});
const template14a = _$createComponent(Comp, {
  get render() {
    return _$memo(() => !!state.dynamic)() && good.good;
  }
});

// no dynamic predicate
const template15 = _$createComponent(Comp, {
  get render() {
    return state.dynamic && good;
  }
});
const template16 = _$createComponent(Comp, {
  get render() {
    return state.dynamic || good();
  }
});
const template16a = _$createComponent(Comp, {
  get render() {
    return state.dynamic || good.good;
  }
});
const template17 = _$createComponent(Comp, {
  get render() {
    return _$memo(() => !!state.dynamic)()
      ? _$createComponent(Comp, {})
      : _$createComponent(Comp, {});
  }
});
const template18 = _$createComponent(Comp, {
  get children() {
    return _$memo(() => !!state.dynamic)()
      ? _$createComponent(Comp, {})
      : _$createComponent(Comp, {});
  }
});
const template19 = (() => {
  var _el$19 = _$getNextElement(_tmpl$);
  _$effect(() =>
    _$setProperty(
      _el$19,
      "innerHTML",
      state.dynamic ? _$createComponent(Comp, {}) : _$createComponent(Comp, {})
    )
  );
  return _el$19;
})();
const template20 = (() => {
  var _el$20 = _$getNextElement(_tmpl$);
  _$insert(
    _el$20,
    (() => {
      var _c$14 = _$memo(() => !!state.dynamic);
      return () => (_c$14() ? _$createComponent(Comp, {}) : _$createComponent(Comp, {}));
    })()
  );
  return _el$20;
})();
const template21 = _$createComponent(Comp, {
  get render() {
    return state?.dynamic ? "a" : "b";
  }
});
const template22 = _$createComponent(Comp, {
  get children() {
    return state?.dynamic ? "a" : "b";
  }
});
const template23 = (() => {
  var _el$21 = _$getNextElement(_tmpl$);
  _$effect(() => _$setProperty(_el$21, "innerHTML", state?.dynamic ? "a" : "b"));
  return _el$21;
})();
const template24 = (() => {
  var _el$22 = _$getNextElement(_tmpl$);
  _$insert(_el$22, () => (state?.dynamic ? "a" : "b"));
  return _el$22;
})();
const template25 = _$createComponent(Comp, {
  get render() {
    return state.dynamic ?? _$createComponent(Comp, {});
  }
});
const template26 = _$createComponent(Comp, {
  get children() {
    return state.dynamic ?? _$createComponent(Comp, {});
  }
});
const template27 = (() => {
  var _el$23 = _$getNextElement(_tmpl$);
  _$effect(() => _$setProperty(_el$23, "innerHTML", state.dynamic ?? _$createComponent(Comp, {})));
  return _el$23;
})();
const template28 = (() => {
  var _el$24 = _$getNextElement(_tmpl$);
  _$insert(_el$24, () => state.dynamic ?? _$createComponent(Comp, {}));
  return _el$24;
})();
const template29 = (() => {
  var _el$25 = _$getNextElement(_tmpl$);
  _$insert(
    _el$25,
    (() => {
      var _c$15 = _$memo(() => !!thing());
      return () => (_c$15() && thing1()) ?? thing2() ?? thing3();
    })()
  );
  return _el$25;
})();
const template29a = (() => {
  var _el$26 = _$getNextElement(_tmpl$);
  _$insert(
    _el$26,
    (() => {
      var _c$16 = _$memo(() => !!thing.thing);
      return () => (_c$16() && thing1.thing1) ?? thing2.thing2 ?? thing3.thing3;
    })()
  );
  return _el$26;
})();
const template30 = (() => {
  var _el$27 = _$getNextElement(_tmpl$);
  _$insert(_el$27, () => thing() || thing1() || thing2());
  return _el$27;
})();
const template30a = (() => {
  var _el$28 = _$getNextElement(_tmpl$);
  _$insert(_el$28, () => thing.thing || thing1.thing1 || thing2.thing2);
  return _el$28;
})();
const template31 = _$createComponent(Comp, {
  get value() {
    return _$memo(() => !!count())() ? (_$memo(() => !!count())() ? count() : count()) : count();
  }
});
const template31a = _$createComponent(Comp, {
  get value() {
    return _$memo(() => !!count.count)()
      ? _$memo(() => !!count.count)()
        ? count.count
        : count.count
      : count.count;
  }
});
const template32 = (() => {
  var _el$29 = _$getNextElement(_tmpl$);
  _$insert(_el$29, () => something?.());
  return _el$29;
})();
const template33 = _$createComponent(Comp, {
  get children() {
    return something?.();
  }
});
const template34 = simple ? good : bad;
const template35 = _$memo(() => (simple ? good() : bad));
const template35a = _$memo(() => (simple ? good.good : bad));
const template36 = _$memo(() => (_$memo(() => !!state.dynamic)() ? good() : bad));
const template36a = _$memo(() => (_$memo(() => !!state.dynamic)() ? good.good : bad));
const template37 = _$memo(() => _$memo(() => !!state.dynamic)() && good());
const template37a = _$memo(() => _$memo(() => !!state.dynamic)() && good.good);
const template38 = _$memo(() =>
  _$memo(() => state.count > 5)() ? (_$memo(() => !!state.dynamic)() ? best : good()) : bad
);
const template38a = _$memo(() =>
  _$memo(() => state.count > 5)() ? (_$memo(() => !!state.dynamic)() ? best : good.good) : bad
);
const template39 = _$memo(() => _$memo(() => !!(state.dynamic && state.something))() && good());
const template39a = _$memo(() => _$memo(() => !!(state.dynamic && state.something))() && good.good);
const template40 = _$memo(() => (_$memo(() => !!state.dynamic)() && good()) || bad);
const template40a = _$memo(() => (_$memo(() => !!state.dynamic)() && good.good) || bad);
const template41 = _$memo(() =>
  _$memo(() => !!state.a)() ? "a" : _$memo(() => !!state.b)() ? "b" : state.c ? "c" : "fallback"
);
const template42 = _$memo(() =>
  _$memo(() => !!state.a)() ? a() : _$memo(() => !!state.b)() ? b() : state.c ? "c" : "fallback"
);
const template42a = _$memo(() =>
  _$memo(() => !!state.a)() ? a.a : _$memo(() => !!state.b)() ? b.b : state.c ? "c" : "fallback"
);
const template43 = _$memo(() =>
  _$memo(() => !!obj1.prop)() ? (_$memo(() => !!obj2.prop)() ? _$getNextElement(_tmpl$2) : []) : []
);
