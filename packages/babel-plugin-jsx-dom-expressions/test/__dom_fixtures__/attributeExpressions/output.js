import { template as _$template } from "r-dom";
import { delegateEvents as _$delegateEvents } from "r-dom";
import { insert as _$insert } from "r-dom";
import { memo as _$memo } from "r-dom";
import { addEventListener as _$addEventListener } from "r-dom";
import { style as _$style } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { effect as _$effect } from "r-dom";
import { className as _$className } from "r-dom";
import { use as _$use } from "r-dom";
import { spread as _$spread } from "r-dom";
import { mergeProps as _$mergeProps } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<div id=main><h1 id=my-h1><a href=/>Welcome`),
  _tmpl$2 = /*#__PURE__*/ _$template(`<div><div></div><div> </div><div>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<div foo>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$5 = /*#__PURE__*/ _$template(`<div class=a className=b>`),
  _tmpl$6 = /*#__PURE__*/ _$template(`<div onclick="console.log('hi')">`),
  _tmpl$7 = /*#__PURE__*/ _$template(`<input type=checkbox checked>`),
  _tmpl$8 = /*#__PURE__*/ _$template(`<input type=checkbox>`),
  _tmpl$9 = /*#__PURE__*/ _$template(`<div class="\`a">\`$\``),
  _tmpl$10 = /*#__PURE__*/ _$template(`<button type=button>Write`),
  _tmpl$11 = /*#__PURE__*/ _$template(`<button class="a b c">Hi`),
  _tmpl$12 = /*#__PURE__*/ _$template(`<div><input readonly><input>`),
  _tmpl$13 = /*#__PURE__*/ _$template(`<div data="&quot;hi&quot;"data2="&quot;">`),
  _tmpl$14 = /*#__PURE__*/ _$template(`<a>`),
  _tmpl$15 = /*#__PURE__*/ _$template(`<div><a>`),
  _tmpl$16 = /*#__PURE__*/ _$template(`<div start=Hi>Hi`),
  _tmpl$17 = /*#__PURE__*/ _$template(`<label><span>Input is </span><input><div>`),
  _tmpl$18 = /*#__PURE__*/ _$template(
    `<div class="class1 class2 class3 class4 class5 class6"style="color:red;background-color:blue !important;border:1px solid black;font-size:12px;"random="random1 random2\n    random3 random4">`
  ),
  _tmpl$19 = /*#__PURE__*/ _$template(`<button>`),
  _tmpl$20 = /*#__PURE__*/ _$template(`<input value=10>`),
  _tmpl$21 = /*#__PURE__*/ _$template(`<select><option>Red</option><option>Blue`),
  _tmpl$22 = /*#__PURE__*/ _$template(`<img src>`),
  _tmpl$23 = /*#__PURE__*/ _$template(`<div><img src>`),
  _tmpl$24 = /*#__PURE__*/ _$template(`<img src loading=lazy>`, true, false, false),
  _tmpl$25 = /*#__PURE__*/ _$template(`<div><img src loading=lazy>`, true, false, false),
  _tmpl$26 = /*#__PURE__*/ _$template(`<iframe src>`),
  _tmpl$27 = /*#__PURE__*/ _$template(`<div><iframe src>`),
  _tmpl$28 = /*#__PURE__*/ _$template(`<iframe src loading=lazy>`, true, false, false),
  _tmpl$29 = /*#__PURE__*/ _$template(`<div><iframe src loading=lazy>`, true, false, false),
  _tmpl$30 = /*#__PURE__*/ _$template(`<div title="<u>data</u>">`),
  _tmpl$31 = /*#__PURE__*/ _$template(`<div true truestr=true truestrjs=true>`),
  _tmpl$32 = /*#__PURE__*/ _$template(`<div falsestr=false falsestrjs=false>`),
  _tmpl$33 = /*#__PURE__*/ _$template(`<div true=true false=false>`),
  _tmpl$34 = /*#__PURE__*/ _$template(`<div a b c d f=0 g h l>`),
  _tmpl$35 = /*#__PURE__*/ _$template(`<math display=block><mrow>`, false, false, true),
  _tmpl$36 = /*#__PURE__*/ _$template(`<mrow><mi>x</mi><mo>=`, false, false, true);
import * as styles from "./styles.module.css";
import { binding } from "somewhere";
function refFn() {}
const refConst = null;
const selected = true;
let id = "my-h1";
let link;
const template = (() => {
  var _el$ = _tmpl$(),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.firstChild;
  _$spread(
    _el$,
    _$mergeProps(results, {
      class: {
        selected: unknown
      },
      style: {
        color
      }
    }),
    false,
    true
  );
  _$spread(
    _el$2,
    _$mergeProps(results, {
      foo: "",
      disabled: "",
      get title() {
        return welcoming();
      },
      get style() {
        return {
          "background-color": color(),
          "margin-right": "40px"
        };
      },
      get ["class"]() {
        return [
          "base",
          {
            dynamic: dynamic(),
            selected
          }
        ];
      }
    }),
    false,
    true
  );
  var _ref$ = link;
  typeof _ref$ === "function" ? _$use(_ref$, _el$3) : (link = _el$3);
  _$className(_el$3, {
    "ccc ddd": true
  });
  return _el$;
})();
const template2 = (() => {
  var _el$4 = _tmpl$2(),
    _el$5 = _el$4.firstChild,
    _el$6 = _el$5.nextSibling,
    _el$7 = _el$6.firstChild,
    _el$8 = _el$6.nextSibling;
  _$spread(
    _el$4,
    _$mergeProps(() => getProps("test")),
    false,
    true
  );
  _el$5.textContent = rowId;
  _el$8.innerHTML = "<div/>";
  _$effect(
    () => row.label,
    _v$ => {
      _el$7.data = _v$;
    }
  );
  return _el$4;
})();
const template3 = (() => {
  var _el$9 = _tmpl$3();
  _$setAttribute(_el$9, "id", state.id);
  state.color != null
    ? _el$9.style.setProperty("background-color", state.color)
    : _el$9.style.removeProperty("background-color");
  _el$9.textContent = state.content;
  _$effect(
    () => state.name,
    _v$ => {
      _$setAttribute(_el$9, "name", _v$);
    }
  );
  return _el$9;
})();
const template4 = (() => {
  var _el$10 = _tmpl$4();
  _$className(_el$10, {
    "ccc:ddd": true
  });
  _$effect(
    () => state.class,
    _v$ => {
      _$setAttribute(_el$10, "className", _v$);
    }
  );
  return _el$10;
})();
const template5 = _tmpl$5();
const template6 = (() => {
  var _el$12 = _tmpl$4();
  _el$12.textContent = "Hi";
  _$effect(someStyle, (_v$, _$p) => {
    _$style(_el$12, _v$, _$p);
  });
  return _el$12;
})();
let undefVar;
const template7 = (() => {
  var _el$13 = _tmpl$4();
  _el$13.classList.toggle("other-class", !!undefVar);
  _el$13.classList.toggle("other-class2", !!undefVar);
  _$effect(
    () => ({
      e: {
        "background-color": color(),
        "margin-right": "40px",
        ...props.style
      },
      t: props.top,
      a: !!props.active
    }),
    ({ e, t, a }, _p$) => {
      _$style(_el$13, e, _p$.e);
      t !== _p$.t &&
        (t != null
          ? _el$13.style.setProperty("padding-top", t)
          : _el$13.style.removeProperty("padding-top"));
      a !== _p$.a && _el$13.classList.toggle("my-class", a);
    },
    {
      e: undefined,
      t: undefined,
      a: undefined
    }
  );
  return _el$13;
})();
let refTarget;
const template8 = (() => {
  var _el$14 = _tmpl$4();
  var _ref$2 = refTarget;
  typeof _ref$2 === "function" ? _$use(_ref$2, _el$14) : (refTarget = _el$14);
  return _el$14;
})();
const template9 = (() => {
  var _el$15 = _tmpl$4();
  _$use(e => console.log(e), _el$15);
  return _el$15;
})();
const template10 = (() => {
  var _el$16 = _tmpl$4();
  var _ref$3 = refFactory();
  typeof _ref$3 === "function" && _$use(_ref$3, _el$16);
  return _el$16;
})();
const template11 = (() => {
  var _el$17 = _tmpl$4();
  _$use(zero, _el$17, () => 0);
  _$use(another, _el$17, () => thing);
  _$use(something, _el$17, () => true);
  return _el$17;
})();
const template12 = (() => {
  var _el$18 = _tmpl$6();
  _el$18.htmlFor = thing;
  _el$18.number = 123;
  return _el$18;
})();
const template13 = _tmpl$7();
const template14 = (() => {
  var _el$20 = _tmpl$8();
  _$effect(
    () => state.visible,
    _v$ => {
      _$setAttribute(_el$20, "checked", _v$);
    }
  );
  return _el$20;
})();
const template15 = _tmpl$9();
const template16 = (() => {
  var _el$22 = _tmpl$10();
  _$className(_el$22, [
    "static",
    {
      hi: "k"
    }
  ]);
  return _el$22;
})();
const template17 = (() => {
  var _el$23 = _tmpl$11();
  _$addEventListener(_el$23, "click", increment, true);
  return _el$23;
})();
const template18 = (() => {
  var _el$24 = _tmpl$4();
  _$spread(
    _el$24,
    _$mergeProps(() => ({
      get [key()]() {
        return props.value;
      }
    })),
    false,
    false
  );
  return _el$24;
})();
const template19 = (() => {
  var _el$25 = _tmpl$4();
  _$className(_el$25, [
    {
      "bg-red-500": true
    },
    "flex flex-col"
  ]);
  return _el$25;
})();
const template20 = (() => {
  var _el$26 = _tmpl$12(),
    _el$27 = _el$26.firstChild,
    _el$28 = _el$27.nextSibling;
  _$addEventListener(_el$27, "input", doSomething, true);
  _$addEventListener(_el$28, "input", doSomethingElse, true);
  _$setAttribute(_el$28, "readonly", value);
  _$effect(
    () => ({
      e: min(),
      t: max(),
      a: min(),
      o: max()
    }),
    ({ e, t, a, o }, _p$) => {
      e !== _p$.e && _$setAttribute(_el$27, "min", e);
      t !== _p$.t && _$setAttribute(_el$27, "max", t);
      a !== _p$.a && _$setAttribute(_el$28, "min", a);
      o !== _p$.o && _$setAttribute(_el$28, "max", o);
    },
    {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    }
  );
  _$effect(s, _v$ => {
    _el$27.value = _v$;
  });
  _$effect(s2, _v$ => {
    _$setAttribute(_el$28, "checked", _v$);
  });
  return _el$26;
})();
const template21 = (() => {
  var _el$29 = _tmpl$4();
  _$effect(
    () => ({
      a: "static",
      ...rest
    }),
    (_v$, _$p) => {
      _$style(_el$29, _v$, _$p);
    }
  );
  return _el$29;
})();
const template22 = _tmpl$13();
const template23 = (() => {
  var _el$31 = _tmpl$4();
  _$insert(_el$31, () => "t" in test && "true");
  _$effect(
    () => "t" in test,
    _v$ => {
      _$setAttribute(_el$31, "disabled", _v$);
    }
  );
  return _el$31;
})();
const template24 = (() => {
  var _el$32 = _tmpl$14();
  _$spread(
    _el$32,
    _$mergeProps(props, {
      something: ""
    }),
    false,
    false
  );
  return _el$32;
})();
const template25 = (() => {
  var _el$33 = _tmpl$15(),
    _el$34 = _el$33.firstChild;
  _$insert(_el$33, () => props.children, _el$34);
  _$spread(
    _el$34,
    _$mergeProps(props, {
      something: ""
    }),
    false,
    false
  );
  return _el$33;
})();
const template26 = (() => {
  var _el$35 = _tmpl$16();
  _$setAttribute(_el$35, "middle", middle);
  _$spread(_el$35, spread, false, true);
  return _el$35;
})();
const template27 = (() => {
  var _el$36 = _tmpl$16();
  _$spread(
    _el$36,
    _$mergeProps(
      first,
      {
        middle: middle
      },
      second
    ),
    false,
    true
  );
  return _el$36;
})();
const template28 = (() => {
  var _el$37 = _tmpl$17(),
    _el$38 = _el$37.firstChild,
    _el$39 = _el$38.firstChild,
    _el$40 = _el$38.nextSibling,
    _el$41 = _el$40.nextSibling;
  _$spread(_el$37, _$mergeProps(api), false, true);
  _$spread(_el$38, _$mergeProps(api), false, true);
  _$insert(_el$38, () => (api() ? "checked" : "unchecked"), null);
  _$spread(_el$40, _$mergeProps(api), false, false);
  _$spread(_el$41, _$mergeProps(api), false, false);
  return _el$37;
})();
const template29 = (() => {
  var _el$42 = _tmpl$4();
  _$setAttribute(_el$42, "attribute", !!someValue);
  _$insert(_el$42, !!someValue);
  return _el$42;
})();
const template30 = _tmpl$18();
const template31 = (() => {
  var _el$44 = _tmpl$4();
  _$effect(
    () => getStore.itemProperties.color,
    _v$ => {
      _v$ != null
        ? _el$44.style.setProperty("background-color", _v$)
        : _el$44.style.removeProperty("background-color");
    }
  );
  return _el$44;
})();
const template32 = (() => {
  var _el$45 = _tmpl$4();
  _el$45.style.removeProperty("background-color");
  return _el$45;
})();
const template33 = [
  (() => {
    var _el$46 = _tmpl$19();
    _$effect(
      () => styles.button,
      (_v$, _$p) => {
        _$className(_el$46, _v$, false, _$p);
      }
    );
    return _el$46;
  })(),
  (() => {
    var _el$47 = _tmpl$19();
    _$effect(
      () => styles["foo--bar"],
      (_v$, _$p) => {
        _$className(_el$47, _v$, false, _$p);
      }
    );
    return _el$47;
  })(),
  (() => {
    var _el$48 = _tmpl$19();
    _$effect(
      () => styles.foo.bar,
      (_v$, _$p) => {
        _$className(_el$48, _v$, false, _$p);
      }
    );
    return _el$48;
  })(),
  (() => {
    var _el$49 = _tmpl$19();
    _$effect(
      () => styles[foo()],
      (_v$, _$p) => {
        _$className(_el$49, _v$, false, _$p);
      }
    );
    return _el$49;
  })()
];
const template34 = (() => {
  var _el$50 = _tmpl$4();
  _$use(zero, _el$50, () => 0);
  _$use(something, _el$50, () => true);
  _$spread(_el$50, somethingElse, false, false);
  return _el$50;
})();
const template35 = (() => {
  var _el$51 = _tmpl$4();
  var _ref$4 = a().b.c;
  typeof _ref$4 === "function" ? _$use(_ref$4, _el$51) : (a().b.c = _el$51);
  return _el$51;
})();
const template36 = (() => {
  var _el$52 = _tmpl$4();
  var _ref$5 = a().b?.c;
  typeof _ref$5 === "function" && _$use(_ref$5, _el$52);
  return _el$52;
})();
const template37 = (() => {
  var _el$53 = _tmpl$4();
  var _ref$6 = a() ? b : c;
  typeof _ref$6 === "function" && _$use(_ref$6, _el$53);
  return _el$53;
})();
const template38 = (() => {
  var _el$54 = _tmpl$4();
  var _ref$7 = a() ?? b;
  typeof _ref$7 === "function" && _$use(_ref$7, _el$54);
  return _el$54;
})();
const template39 = _tmpl$20();
const template40 = (() => {
  var _el$56 = _tmpl$4();
  _$effect(a, _v$ => {
    _v$ != null ? _el$56.style.setProperty("color", _v$) : _el$56.style.removeProperty("color");
  });
  return _el$56;
})();
const template41 = (() => {
  var _el$57 = _tmpl$21(),
    _el$58 = _el$57.firstChild,
    _el$59 = _el$58.nextSibling;
  _$effect(
    () => Color.Red,
    _v$ => {
      _el$58.value = _v$;
    }
  );
  _$effect(
    () => Color.Blue,
    _v$ => {
      _el$59.value = _v$;
    }
  );
  _$effect(
    () => state.color,
    _v$ => {
      queueMicrotask(() => (_el$57.value = _v$)) || (_el$57.value = _v$);
    }
  );
  return _el$57;
})();
const template63 = _tmpl$22();
const template64 = _tmpl$23();
const template65 = _tmpl$24();
const template66 = _tmpl$25();
const template67 = _tmpl$26();
const template68 = _tmpl$27();
const template69 = _tmpl$28();
const template70 = _tmpl$29();
const template71 = _tmpl$30();
const template72 = (() => {
  var _el$69 = _tmpl$4();
  _$use(binding, _el$69);
  return _el$69;
})();
const template73 = (() => {
  var _el$70 = _tmpl$4();
  var _ref$8 = binding.prop;
  typeof _ref$8 === "function" ? _$use(_ref$8, _el$70) : (binding.prop = _el$70);
  return _el$70;
})();
const template74 = (() => {
  var _el$71 = _tmpl$4();
  var _ref$9 = refFn;
  typeof _ref$9 === "function" ? _$use(_ref$9, _el$71) : (refFn = _el$71);
  return _el$71;
})();
const template75 = (() => {
  var _el$72 = _tmpl$4();
  _$use(refConst, _el$72);
  return _el$72;
})();
const template76 = (() => {
  var _el$73 = _tmpl$4();
  var _ref$10 = refUnknown;
  typeof _ref$10 === "function" ? _$use(_ref$10, _el$73) : (refUnknown = _el$73);
  return _el$73;
})();
const template77 = _tmpl$31();
const template78 = _tmpl$32();
const template79 = (() => {
  var _el$76 = _tmpl$4();
  _el$76.true = true;
  _el$76.false = false;
  return _el$76;
})();
const template80 = _tmpl$33();
const template81 = (() => {
  var _el$78 = _tmpl$34();
  _$setAttribute(_el$78, "i", undefined);
  _$setAttribute(_el$78, "j", null);
  _$setAttribute(_el$78, "k", void 0);
  return _el$78;
})();
const template82 = _tmpl$35();
const template83 = _tmpl$36();
_$delegateEvents(["click", "input"]);
