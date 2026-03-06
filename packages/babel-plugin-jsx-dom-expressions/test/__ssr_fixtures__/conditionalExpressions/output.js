import { createComponent as _$createComponent } from "r-server";
import { memo as _$memo } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { ssr as _$ssr } from "r-server";
import { escape as _$escape } from "r-server";
var _tmpl$ = ["<div>", "</div>"],
  _tmpl$2 = "<div>Output</div>";
const template1 = (() => {
  var _v$ = _$escape(simple);
  return _$ssr(_tmpl$, _v$);
})();
const template2 = (() => {
  var _v$2 = _$ssrRunInScope(() => _$escape(state.dynamic));
  return _$ssr(_tmpl$, _v$2);
})();
const template3 = (() => {
  var _v$3 = simple ? _$escape(good) : _$escape(bad);
  return _$ssr(_tmpl$, _v$3);
})();
const template4 = (() => {
  var _v$4 = _$ssrRunInScope(() => (simple ? _$escape(good()) : _$escape(bad)));
  return _$ssr(_tmpl$, _v$4);
})();
const template4a = (() => {
  var _v$5 = _$ssrRunInScope(() => (simple ? _$escape(good.good) : _$escape(bad)));
  return _$ssr(_tmpl$, _v$5);
})();
const template5 = (() => {
  var _v$6 = (() => {
    var _c$ = _$memo(() => !!state.dynamic);
    return () => (_c$() ? _$escape(good()) : _$escape(bad));
  })();
  return _$ssr(_tmpl$, _v$6);
})();
const template5a = (() => {
  var _v$7 = (() => {
    var _c$2 = _$memo(() => !!state.dynamic);
    return () => (_c$2() ? _$escape(good.good) : _$escape(bad));
  })();
  return _$ssr(_tmpl$, _v$7);
})();
const template6 = (() => {
  var _v$8 = (() => {
    var _c$3 = _$memo(() => !!state.dynamic);
    return () => _c$3() && _$escape(good());
  })();
  return _$ssr(_tmpl$, _v$8);
})();
const template6a = (() => {
  var _v$9 = (() => {
    var _c$4 = _$memo(() => !!state.dynamic);
    return () => _c$4() && _$escape(good.good);
  })();
  return _$ssr(_tmpl$, _v$9);
})();
const template7 = (() => {
  var _v$10 = (() => {
    var _c$5 = _$memo(() => state.count > 5);
    return () =>
      _c$5()
        ? _$memo(() => !!state.dynamic)()
          ? _$escape(best)
          : _$escape(good())
        : _$escape(bad);
  })();
  return _$ssr(_tmpl$, _v$10);
})();
const template7a = (() => {
  var _v$11 = (() => {
    var _c$6 = _$memo(() => state.count > 5);
    return () =>
      _c$6()
        ? _$memo(() => !!state.dynamic)()
          ? _$escape(best)
          : _$escape(good.good)
        : _$escape(bad);
  })();
  return _$ssr(_tmpl$, _v$11);
})();
const template8 = (() => {
  var _v$12 = (() => {
    var _c$7 = _$memo(() => !!(state.dynamic && state.something));
    return () => _c$7() && _$escape(good());
  })();
  return _$ssr(_tmpl$, _v$12);
})();
const template8a = (() => {
  var _v$13 = (() => {
    var _c$8 = _$memo(() => !!(state.dynamic && state.something));
    return () => _c$8() && _$escape(good.good);
  })();
  return _$ssr(_tmpl$, _v$13);
})();
const template9 = (() => {
  var _v$14 = (() => {
    var _c$9 = _$memo(() => !!state.dynamic);
    return () => (_c$9() && _$escape(good())) || _$escape(bad);
  })();
  return _$ssr(_tmpl$, _v$14);
})();
const template9a = (() => {
  var _v$15 = (() => {
    var _c$10 = _$memo(() => !!state.dynamic);
    return () => (_c$10() && _$escape(good.good)) || _$escape(bad);
  })();
  return _$ssr(_tmpl$, _v$15);
})();
const template10 = (() => {
  var _v$16 = (() => {
    var _c$11 = _$memo(() => !!state.a);
    return () => (_c$11() ? "a" : _$memo(() => !!state.b)() ? "b" : state.c ? "c" : "fallback");
  })();
  return _$ssr(_tmpl$, _v$16);
})();
const template11 = (() => {
  var _v$17 = (() => {
    var _c$12 = _$memo(() => !!state.a);
    return () =>
      _c$12()
        ? _$escape(a())
        : _$memo(() => !!state.b)()
        ? _$escape(b())
        : state.c
        ? "c"
        : "fallback";
  })();
  return _$ssr(_tmpl$, _v$17);
})();
const template11a = (() => {
  var _v$18 = (() => {
    var _c$13 = _$memo(() => !!state.a);
    return () =>
      _c$13()
        ? _$escape(a.a)
        : _$memo(() => !!state.b)()
        ? _$escape(b.b)
        : state.c
        ? "c"
        : "fallback";
  })();
  return _$ssr(_tmpl$, _v$18);
})();
const template12 = _$createComponent(Comp, {
  get render() {
    return state.dynamic ? good() : bad;
  }
});
const template12a = _$createComponent(Comp, {
  get render() {
    return state.dynamic ? good.good : bad;
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
    return state.dynamic && good();
  }
});
const template14a = _$createComponent(Comp, {
  get render() {
    return state.dynamic && good.good;
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
    return state.dynamic ? _$createComponent(Comp, {}) : _$createComponent(Comp, {});
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
  var _v$19 = (() => {
    var _c$14 = _$memo(() => !!state.dynamic);
    return () => (_c$14() ? _$createComponent(Comp, {}) : _$createComponent(Comp, {}));
  })();
  return _$ssr(_tmpl$, _v$19);
})();
const template20 = (() => {
  var _v$20 = (() => {
    var _c$15 = _$memo(() => !!state.dynamic);
    return () =>
      _c$15() ? _$escape(_$createComponent(Comp, {})) : _$escape(_$createComponent(Comp, {}));
  })();
  return _$ssr(_tmpl$, _v$20);
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
  var _v$21 = _$ssrRunInScope(() => (state?.dynamic ? "a" : "b"));
  return _$ssr(_tmpl$, _v$21);
})();
const template24 = (() => {
  var _v$22 = _$ssrRunInScope(() => (state?.dynamic ? "a" : "b"));
  return _$ssr(_tmpl$, _v$22);
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
  var _v$23 = _$ssrRunInScope(() => state.dynamic ?? _$createComponent(Comp, {}));
  return _$ssr(_tmpl$, _v$23);
})();
const template28 = (() => {
  var _v$24 = _$ssrRunInScope(
    () => _$escape(state.dynamic) ?? _$escape(_$createComponent(Comp, {}))
  );
  return _$ssr(_tmpl$, _v$24);
})();
const template29 = (() => {
  var _v$25 = (() => {
    var _c$16 = _$memo(() => !!thing());
    return () => (_c$16() && _$escape(thing1())) ?? _$escape(thing2()) ?? _$escape(thing3());
  })();
  return _$ssr(_tmpl$, _v$25);
})();
const template29a = (() => {
  var _v$26 = (() => {
    var _c$17 = _$memo(() => !!thing.thing);
    return () =>
      (_c$17() && _$escape(thing1.thing1)) ?? _$escape(thing2.thing2) ?? _$escape(thing3.thing3);
  })();
  return _$ssr(_tmpl$, _v$26);
})();
const template30 = (() => {
  var _v$27 = _$ssrRunInScope(() => _$escape(thing()) || _$escape(thing1()) || _$escape(thing2()));
  return _$ssr(_tmpl$, _v$27);
})();
const template30a = (() => {
  var _v$28 = _$ssrRunInScope(
    () => _$escape(thing.thing) || _$escape(thing1.thing1) || _$escape(thing2.thing2)
  );
  return _$ssr(_tmpl$, _v$28);
})();
const template31 = _$createComponent(Comp, {
  get value() {
    return count() ? (count() ? count() : count()) : count();
  }
});
const template31a = _$createComponent(Comp, {
  get value() {
    return count.count ? (count.count ? count.count : count.count) : count.count;
  }
});
const template32 = (() => {
  var _v$29 = _$ssrRunInScope(() => _$escape(something?.()));
  return _$ssr(_tmpl$, _v$29);
})();
const template32a = (() => {
  var _v$30 = _$ssrRunInScope(() => _$escape(something?.something));
  return _$ssr(_tmpl$, _v$30);
})();
const template33 = _$createComponent(Comp, {
  get children() {
    return something?.();
  }
});
const template33a = _$createComponent(Comp, {
  get children() {
    return something?.something;
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
  _$memo(() => state.count > 5)() ? (_$memo(() => !!state.dynamic)() ? best : good.good) : bad.bad
);
const template39 = _$memo(() => _$memo(() => !!(state.dynamic && state.something))() && good());
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
  _$memo(() => !!obj1.prop)() ? (_$memo(() => !!obj2.prop)() ? _$ssr(_tmpl$2) : []) : []
);
