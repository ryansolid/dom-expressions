import { createComponent as _$createComponent } from "r-server";
import { memo as _$memo } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { ssr as _$ssr } from "r-server";
import { escape as _$escape } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = ["<div", ">", "</div>"],
  _tmpl$2 = ["<div", ">Output</div>"];
const template1 = (() => {
  var _v$ = _$ssrHydrationKey(),
    _v$2 = _$escape(simple);
  return _$ssr(_tmpl$, _v$, _v$2);
})();
const template2 = (() => {
  var _v$3 = _$ssrHydrationKey(),
    _v$4 = _$ssrRunInScope(() => _$escape(state.dynamic));
  return _$ssr(_tmpl$, _v$3, _v$4);
})();
const template3 = (() => {
  var _v$5 = _$ssrHydrationKey(),
    _v$6 = simple ? _$escape(good) : _$escape(bad);
  return _$ssr(_tmpl$, _v$5, _v$6);
})();
const template4 = (() => {
  var _v$7 = _$ssrHydrationKey(),
    _v$8 = _$ssrRunInScope(() => (simple ? _$escape(good()) : _$escape(bad)));
  return _$ssr(_tmpl$, _v$7, _v$8);
})();
const template4a = (() => {
  var _v$9 = _$ssrHydrationKey(),
    _v$10 = _$ssrRunInScope(() => (simple ? _$escape(good.good) : _$escape(bad)));
  return _$ssr(_tmpl$, _v$9, _v$10);
})();
const template5 = (() => {
  var _v$11 = _$ssrHydrationKey(),
    _v$12 = (() => {
      var _c$ = _$memo(() => !!state.dynamic);
      return () => (_c$() ? _$escape(good()) : _$escape(bad));
    })();
  return _$ssr(_tmpl$, _v$11, _v$12);
})();
const template5a = (() => {
  var _v$13 = _$ssrHydrationKey(),
    _v$14 = (() => {
      var _c$2 = _$memo(() => !!state.dynamic);
      return () => (_c$2() ? _$escape(good.good) : _$escape(bad));
    })();
  return _$ssr(_tmpl$, _v$13, _v$14);
})();
const template6 = (() => {
  var _v$15 = _$ssrHydrationKey(),
    _v$16 = (() => {
      var _c$3 = _$memo(() => !!state.dynamic);
      return () => _c$3() && _$escape(good());
    })();
  return _$ssr(_tmpl$, _v$15, _v$16);
})();
const template6a = (() => {
  var _v$17 = _$ssrHydrationKey(),
    _v$18 = (() => {
      var _c$4 = _$memo(() => !!state.dynamic);
      return () => _c$4() && _$escape(good.good);
    })();
  return _$ssr(_tmpl$, _v$17, _v$18);
})();
const template7 = (() => {
  var _v$19 = _$ssrHydrationKey(),
    _v$20 = (() => {
      var _c$5 = _$memo(() => state.count > 5);
      return () =>
        _c$5()
          ? _$memo(() => !!state.dynamic)()
            ? _$escape(best)
            : _$escape(good())
          : _$escape(bad);
    })();
  return _$ssr(_tmpl$, _v$19, _v$20);
})();
const template7a = (() => {
  var _v$21 = _$ssrHydrationKey(),
    _v$22 = (() => {
      var _c$6 = _$memo(() => state.count > 5);
      return () =>
        _c$6()
          ? _$memo(() => !!state.dynamic)()
            ? _$escape(best)
            : _$escape(good.good)
          : _$escape(bad);
    })();
  return _$ssr(_tmpl$, _v$21, _v$22);
})();
const template8 = (() => {
  var _v$23 = _$ssrHydrationKey(),
    _v$24 = (() => {
      var _c$7 = _$memo(() => !!(state.dynamic && state.something));
      return () => _c$7() && _$escape(good());
    })();
  return _$ssr(_tmpl$, _v$23, _v$24);
})();
const template8a = (() => {
  var _v$25 = _$ssrHydrationKey(),
    _v$26 = (() => {
      var _c$8 = _$memo(() => !!(state.dynamic && state.something));
      return () => _c$8() && _$escape(good.good);
    })();
  return _$ssr(_tmpl$, _v$25, _v$26);
})();
const template9 = (() => {
  var _v$27 = _$ssrHydrationKey(),
    _v$28 = (() => {
      var _c$9 = _$memo(() => !!state.dynamic);
      return () => _$escape((_c$9() && good()) || bad);
    })();
  return _$ssr(_tmpl$, _v$27, _v$28);
})();
const template9a = (() => {
  var _v$29 = _$ssrHydrationKey(),
    _v$30 = (() => {
      var _c$10 = _$memo(() => !!state.dynamic);
      return () => _$escape((_c$10() && good.good) || bad);
    })();
  return _$ssr(_tmpl$, _v$29, _v$30);
})();
const template10 = (() => {
  var _v$31 = _$ssrHydrationKey(),
    _v$32 = (() => {
      var _c$11 = _$memo(() => !!state.a);
      return () => (_c$11() ? "a" : _$memo(() => !!state.b)() ? "b" : state.c ? "c" : "fallback");
    })();
  return _$ssr(_tmpl$, _v$31, _v$32);
})();
const template11 = (() => {
  var _v$33 = _$ssrHydrationKey(),
    _v$34 = (() => {
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
  return _$ssr(_tmpl$, _v$33, _v$34);
})();
const template11a = (() => {
  var _v$35 = _$ssrHydrationKey(),
    _v$36 = (() => {
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
  return _$ssr(_tmpl$, _v$35, _v$36);
})();
const template12 = _$createComponent(Comp, {
  get render() {
    return state.dynamic ? good() : bad;
  }
});
const template12a = _$createComponent(Comp, {
  get render() {
    return state.dynamic ? good.goood : bad;
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
  var _v$37 = _$ssrHydrationKey(),
    _v$38 = (() => {
      var _c$14 = _$memo(() => !!state.dynamic);
      return () => (_c$14() ? _$createComponent(Comp, {}) : _$createComponent(Comp, {}));
    })();
  return _$ssr(_tmpl$, _v$37, _v$38);
})();
const template20 = (() => {
  var _v$39 = _$ssrHydrationKey(),
    _v$40 = (() => {
      var _c$15 = _$memo(() => !!state.dynamic);
      return () =>
        _c$15() ? _$escape(_$createComponent(Comp, {})) : _$escape(_$createComponent(Comp, {}));
    })();
  return _$ssr(_tmpl$, _v$39, _v$40);
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
  var _v$41 = _$ssrHydrationKey(),
    _v$42 = _$ssrRunInScope(() => (state?.dynamic ? "a" : "b"));
  return _$ssr(_tmpl$, _v$41, _v$42);
})();
const template24 = (() => {
  var _v$43 = _$ssrHydrationKey(),
    _v$44 = _$ssrRunInScope(() => (state?.dynamic ? "a" : "b"));
  return _$ssr(_tmpl$, _v$43, _v$44);
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
  var _v$45 = _$ssrHydrationKey(),
    _v$46 = _$ssrRunInScope(() => state.dynamic ?? _$createComponent(Comp, {}));
  return _$ssr(_tmpl$, _v$45, _v$46);
})();
const template28 = (() => {
  var _v$47 = _$ssrHydrationKey(),
    _v$48 = _$ssrRunInScope(() => _$escape(state.dynamic ?? _$createComponent(Comp, {})));
  return _$ssr(_tmpl$, _v$47, _v$48);
})();
const template29 = (() => {
  var _v$49 = _$ssrHydrationKey(),
    _v$50 = (() => {
      var _c$16 = _$memo(() => !!thing());
      return () => _$escape((_c$16() && thing1()) ?? thing2() ?? thing3());
    })();
  return _$ssr(_tmpl$, _v$49, _v$50);
})();
const template29a = (() => {
  var _v$51 = _$ssrHydrationKey(),
    _v$52 = (() => {
      var _c$17 = _$memo(() => !!thing.thing);
      return () => _$escape((_c$17() && thing1.thing1) ?? thing2.thing2 ?? thing3.thing3);
    })();
  return _$ssr(_tmpl$, _v$51, _v$52);
})();
const template30 = (() => {
  var _v$53 = _$ssrHydrationKey(),
    _v$54 = _$ssrRunInScope(() => _$escape(thing() || thing1() || thing2()));
  return _$ssr(_tmpl$, _v$53, _v$54);
})();
const template30a = (() => {
  var _v$55 = _$ssrHydrationKey(),
    _v$56 = _$ssrRunInScope(() => _$escape(thing.thing || thing1.thing1 || thing2.thing2));
  return _$ssr(_tmpl$, _v$55, _v$56);
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
  var _v$57 = _$ssrHydrationKey(),
    _v$58 = _$ssrRunInScope(() => _$escape(something?.()));
  return _$ssr(_tmpl$, _v$57, _v$58);
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
  _$memo(() => !!obj1.prop)()
    ? _$memo(() => !!obj2.prop)()
      ? (() => {
          var _v$59 = _$ssrHydrationKey();
          return _$ssr(_tmpl$2, _v$59);
        })()
      : []
    : []
);
