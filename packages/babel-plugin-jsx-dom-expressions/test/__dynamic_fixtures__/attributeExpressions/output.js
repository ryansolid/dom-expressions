import { template as _$template } from "r-dom";
import { delegateEvents as _$delegateEvents } from "r-dom";
import { createTextNode as _$createTextNode } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { setProp as _$setProp } from "r-custom";
import { createElement as _$createElement } from "r-custom";
import { insert as _$insert } from "r-dom";
import { memo as _$memo } from "r-custom";
import { addEventListener as _$addEventListener } from "r-dom";
import { style as _$style } from "r-dom";
import { setStyleProperty as _$setStyleProperty } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { effect as _$effect } from "r-custom";
import { className as _$className } from "r-dom";
import { use as _$use } from "r-dom";
import { spread as _$spread } from "r-dom";
import { mergeProps as _$mergeProps } from "r-custom";
var _tmpl$ = /*#__PURE__*/ _$template(`<div id=main><h1 id=my-h1><a href=/>Welcome`),
  _tmpl$2 = /*#__PURE__*/ _$template(`<div><div></div><div> </div><div>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<div foo>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$5 = /*#__PURE__*/ _$template(`<div class=a className=b>`),
  _tmpl$6 = /*#__PURE__*/ _$template(`<div style=margin-right:40px>`),
  _tmpl$7 = /*#__PURE__*/ _$template(`<div onclick="console.log('hi')">`),
  _tmpl$8 = /*#__PURE__*/ _$template(`<input type=checkbox checked>`),
  _tmpl$9 = /*#__PURE__*/ _$template(`<input type=checkbox>`),
  _tmpl$10 = /*#__PURE__*/ _$template(`<div class="\`a">\`$\``),
  _tmpl$11 = /*#__PURE__*/ _$template(`<button type=button>Write`),
  _tmpl$12 = /*#__PURE__*/ _$template(`<button class="a b c">Hi`),
  _tmpl$13 = /*#__PURE__*/ _$template(`<div><input readonly><input>`),
  _tmpl$14 = /*#__PURE__*/ _$template(`<div data="&quot;hi&quot;"data2="&quot;">`),
  _tmpl$15 = /*#__PURE__*/ _$template(`<a>`),
  _tmpl$16 = /*#__PURE__*/ _$template(`<div><a>`),
  _tmpl$17 = /*#__PURE__*/ _$template(`<div start=Hi>Hi`),
  _tmpl$18 = /*#__PURE__*/ _$template(`<label><span>Input is </span><input><div>`),
  _tmpl$19 = /*#__PURE__*/ _$template(
    `<div class="class1 class2 class3 class4 class5 class6"random="random1 random2\n    random3 random4"style="color:red;background-color:blue !important;border:1px solid black;font-size:12px">`
  ),
  _tmpl$20 = /*#__PURE__*/ _$template(`<button>`),
  _tmpl$21 = /*#__PURE__*/ _$template(`<input value=10>`),
  _tmpl$22 = /*#__PURE__*/ _$template(`<select><option>Red</option><option>Blue`),
  _tmpl$23 = /*#__PURE__*/ _$template(`<img src>`),
  _tmpl$24 = /*#__PURE__*/ _$template(`<div><img src>`),
  _tmpl$25 = /*#__PURE__*/ _$template(`<img src loading=lazy>`, true, false, false),
  _tmpl$26 = /*#__PURE__*/ _$template(`<div><img src loading=lazy>`, true, false, false),
  _tmpl$27 = /*#__PURE__*/ _$template(`<iframe src>`),
  _tmpl$28 = /*#__PURE__*/ _$template(`<div><iframe src>`),
  _tmpl$29 = /*#__PURE__*/ _$template(`<iframe src loading=lazy>`, true, false, false),
  _tmpl$30 = /*#__PURE__*/ _$template(`<div><iframe src loading=lazy>`, true, false, false),
  _tmpl$31 = /*#__PURE__*/ _$template(`<div title="<u>data</u>">`),
  _tmpl$32 = /*#__PURE__*/ _$template(`<div true truestr=true truestrjs=true>`),
  _tmpl$33 = /*#__PURE__*/ _$template(`<div falsestr=false falsestrjs=false>`),
  _tmpl$34 = /*#__PURE__*/ _$template(`<div true>`),
  _tmpl$35 = /*#__PURE__*/ _$template(`<div a b c d f=0 g h l>`),
  _tmpl$36 = /*#__PURE__*/ _$template(`<div style=background:red>`),
  _tmpl$37 = /*#__PURE__*/ _$template(
    `<div style=background:red;color:green;margin:3;padding:0.4>`
  ),
  _tmpl$38 = /*#__PURE__*/ _$template(`<div style=background:red;color:green>`),
  _tmpl$39 = /*#__PURE__*/ _$template(`<video>`),
  _tmpl$40 = /*#__PURE__*/ _$template(`<video playsinline>`),
  _tmpl$41 = /*#__PURE__*/ _$template(`<video poster=1.jpg>`),
  _tmpl$42 = /*#__PURE__*/ _$template(`<div><video poster=1.jpg>`),
  _tmpl$43 = /*#__PURE__*/ _$template(`<div><video>`),
  _tmpl$44 = /*#__PURE__*/ _$template(`<button type=button>`);
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
      foo: true,
      disabled: true,
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
  _$setStyleProperty(_el$9, "background-color", state.color);
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
  var _el$13 = _tmpl$6();
  _el$13.classList.toggle("other-class", !!undefVar);
  _el$13.classList.toggle("other-class2", !!undefVar);
  _$effect(
    () => ({
      e: {
        "background-color": color(),
        ...props.style
      },
      t: props.top,
      a: !!props.active
    }),
    ({ e, t, a }, _p$) => {
      _$style(_el$13, e, _p$.e);
      t !== _p$.t && _$setStyleProperty(_el$13, "padding-top", t);
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
  var _el$18 = _tmpl$7();
  _el$18.htmlFor = thing;
  _el$18.number = 123;
  return _el$18;
})();
const template13 = _tmpl$8();
const template14 = (() => {
  var _el$20 = _tmpl$9();
  _$effect(
    () => state.visible,
    _v$ => {
      _el$20.checked = _v$;
    }
  );
  return _el$20;
})();
const template15 = _tmpl$10();
const template16 = (() => {
  var _el$22 = _tmpl$11();
  _$className(_el$22, [
    "static",
    {
      hi: "k"
    }
  ]);
  return _el$22;
})();
const template17 = (() => {
  var _el$23 = _tmpl$12();
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
  var _el$26 = _tmpl$13(),
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
    _el$28.checked = _v$;
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
const template22 = _tmpl$14();
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
  var _el$32 = _tmpl$15();
  _$spread(
    _el$32,
    _$mergeProps(props, {
      something: true
    }),
    false,
    false
  );
  return _el$32;
})();
const template25 = (() => {
  var _el$33 = _tmpl$16(),
    _el$34 = _el$33.firstChild;
  _$insert(_el$33, () => props.children, _el$34);
  _$spread(
    _el$34,
    _$mergeProps(props, {
      something: true
    }),
    false,
    false
  );
  return _el$33;
})();
const template26 = (() => {
  var _el$35 = _tmpl$17();
  _$setAttribute(_el$35, "middle", middle);
  _$spread(_el$35, spread, false, true);
  return _el$35;
})();
const template27 = (() => {
  var _el$36 = _tmpl$17();
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
  var _el$37 = _tmpl$18(),
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
const template30 = _tmpl$19();
const template31 = (() => {
  var _el$44 = _tmpl$4();
  _$effect(
    () => getStore.itemProperties.color,
    _v$ => {
      _$setStyleProperty(_el$44, "background-color", _v$);
    }
  );
  return _el$44;
})();
const template32 = _tmpl$4();
const template33 = [
  (() => {
    var _el$46 = _tmpl$20();
    _$effect(
      () => styles.button,
      (_v$, _$p) => {
        _$className(_el$46, _v$, false, _$p);
      }
    );
    return _el$46;
  })(),
  (() => {
    var _el$47 = _tmpl$20();
    _$effect(
      () => styles["foo--bar"],
      (_v$, _$p) => {
        _$className(_el$47, _v$, false, _$p);
      }
    );
    return _el$47;
  })(),
  (() => {
    var _el$48 = _tmpl$20();
    _$effect(
      () => styles.foo.bar,
      (_v$, _$p) => {
        _$className(_el$48, _v$, false, _$p);
      }
    );
    return _el$48;
  })(),
  (() => {
    var _el$49 = _tmpl$20();
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
const template39 = _tmpl$21();
const template40 = (() => {
  var _el$56 = _tmpl$4();
  _$effect(a, _v$ => {
    _$setStyleProperty(_el$56, "color", _v$);
  });
  return _el$56;
})();
const template41 = (() => {
  var _el$57 = _tmpl$22(),
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
const template42 = _tmpl$23();
const template43 = _tmpl$24();
const template44 = _tmpl$25();
const template45 = _tmpl$26();
const template46 = _tmpl$27();
const template47 = _tmpl$28();
const template48 = _tmpl$29();
const template49 = _tmpl$30();
const template50 = _tmpl$31();
const template51 = (() => {
  var _el$69 = _tmpl$4();
  _$use(binding, _el$69);
  return _el$69;
})();
const template52 = (() => {
  var _el$70 = _tmpl$4();
  var _ref$8 = binding.prop;
  typeof _ref$8 === "function" ? _$use(_ref$8, _el$70) : (binding.prop = _el$70);
  return _el$70;
})();
const template53 = (() => {
  var _el$71 = _tmpl$4();
  var _ref$9 = refFn;
  typeof _ref$9 === "function" ? _$use(_ref$9, _el$71) : (refFn = _el$71);
  return _el$71;
})();
const template54 = (() => {
  var _el$72 = _tmpl$4();
  _$use(refConst, _el$72);
  return _el$72;
})();
const template55 = (() => {
  var _el$73 = _tmpl$4();
  var _ref$10 = refUnknown;
  typeof _ref$10 === "function" ? _$use(_ref$10, _el$73) : (refUnknown = _el$73);
  return _el$73;
})();
const template56 = _tmpl$32();
const template57 = _tmpl$33();
const template58 = (() => {
  var _el$76 = _tmpl$4();
  _el$76.true = true;
  _el$76.false = false;
  return _el$76;
})();
const template59 = _tmpl$34();
const template60 = (() => {
  var _el$78 = _tmpl$35();
  _$setAttribute(_el$78, "i", undefined);
  _$setAttribute(_el$78, "j", null);
  _$setAttribute(_el$78, "k", void 0);
  return _el$78;
})();
const template61 = (() => {
  var _el$79 = _$createElement("math"),
    _el$80 = _$createElement("mrow");
  _$insertNode(_el$79, _el$80);
  _$setProp(_el$79, "display", "block");
  return _el$79;
})();
const template62 = (() => {
  var _el$81 = _$createElement("mrow"),
    _el$82 = _$createElement("mi"),
    _el$84 = _$createElement("mo");
  _$insertNode(_el$81, _el$82);
  _$insertNode(_el$81, _el$84);
  _$insertNode(_el$82, _$createTextNode(`x`));
  _$insertNode(_el$84, _$createTextNode(`=`));
  return _el$81;
})();
const template63 = _tmpl$36();
const template64 = _tmpl$37();
const template65 = _tmpl$38();
const template66 = (() => {
  var _el$89 = _tmpl$38();
  _$effect(signal, _v$ => {
    _$setStyleProperty(_el$89, "border", _v$);
  });
  return _el$89;
})();
const template67 = (() => {
  var _el$90 = _tmpl$38();
  _$setStyleProperty(_el$90, "border", somevalue);
  return _el$90;
})();
const template68 = (() => {
  var _el$91 = _tmpl$38();
  _$effect(
    () => some.access,
    _v$ => {
      _$setStyleProperty(_el$91, "border", _v$);
    }
  );
  return _el$91;
})();
const template69 = _tmpl$38();
const template70 = (() => {
  var _el$93 = _tmpl$39();
  _$setAttribute(_el$93, "playsinline", value);
  return _el$93;
})();
const template71 = _tmpl$40();
const template72 = _tmpl$39();
const template73 = _tmpl$41();
const template74 = _tmpl$42();
const template75 = (() => {
  var _el$98 = _tmpl$39();
  _el$98.poster = "1.jpg";
  return _el$98;
})();
const template76 = (() => {
  var _el$99 = _tmpl$43(),
    _el$100 = _el$99.firstChild;
  _el$100.poster = "1.jpg";
  return _el$99;
})();

// ONCE TESTS

const template77 = (() => {
  var _el$101 = _tmpl$4();
  _$setStyleProperty(_el$101, "width", props.width);
  _$setStyleProperty(_el$101, "height", props.height);
  return _el$101;
})();
const template78 = (() => {
  var _el$102 = _tmpl$4();
  _$setStyleProperty(_el$102, "width", props.width);
  _$setStyleProperty(_el$102, "height", props.height);
  _$effect(color, _v$ => {
    _$setAttribute(_el$102, "something", _v$);
  });
  return _el$102;
})();
const template79 = (() => {
  var _el$103 = _tmpl$4();
  _$setStyleProperty(_el$103, "height", props.height);
  _$setAttribute(_el$103, "something", color());
  _$effect(
    () => props.width,
    _v$ => {
      _$setStyleProperty(_el$103, "width", _v$);
    }
  );
  return _el$103;
})();

// ONCE TESTS SPREADS

const propsSpread = {
  something: color(),
  style: {
    "background-color": color(),
    color: /* @once*/ color(),
    "margin-right": /* @once */ props.right
  }
};
const template80 = (() => {
  var _el$104 = _tmpl$4();
  _$spread(_el$104, propsSpread, false, false);
  return _el$104;
})();
const template81 = (() => {
  var _el$105 = _tmpl$4();
  _$spread(
    _el$105,
    {
      ...propsSpread
    },
    false,
    false
  );
  return _el$105;
})();
const template82 = (() => {
  var _el$106 = _tmpl$4();
  _$spread(
    _el$106,
    _$mergeProps(propsSpread, {
      get ["data-dynamic"]() {
        return color();
      },
      "data-static": color()
    }),
    false,
    false
  );
  return _el$106;
})();
const template83 = (() => {
  var _el$107 = _tmpl$4();
  _$spread(
    _el$107,
    _$mergeProps(
      {
        ...propsSpread
      },
      {
        get ["data-dynamic"]() {
          return color();
        },
        "data-static": color()
      }
    ),
    false,
    false
  );
  return _el$107;
})();
const template84 = (() => {
  var _el$108 = _tmpl$4();
  _$spread(
    _el$108,
    _$mergeProps(
      {
        ...propsSpread1
      },
      propsSpread2,
      {
        ...propsSpread3
      },
      {
        get ["data-dynamic"]() {
          return color();
        },
        "data-static": color()
      }
    ),
    false,
    false
  );
  return _el$108;
})();

// ONCE PROPERTY OF OBJECT ACCESS

// https://github.com/ryansolid/dom-expressions/issues/252#issuecomment-1572220563
const styleProp = {
  style: {
    width: props.width,
    height: props.height
  }
};
const template85 = (() => {
  var _el$109 = _tmpl$4();
  _$style(_el$109, styleProp.style);
  return _el$109;
})();
const template86 = (() => {
  var _el$110 = _tmpl$4();
  _$effect(
    () => styleProp.style,
    (_v$, _$p) => {
      _$style(_el$110, _v$, _$p);
    }
  );
  return _el$110;
})();
const style = {
  background: "red",
  border: "solid black " + count() + "px"
};
const template87 = (() => {
  var _el$111 = _tmpl$44();
  _$insert(_el$111, count);
  _$effect(
    () => ({
      e: count(),
      t: style,
      a: style
    }),
    ({ e, t, a }, _p$) => {
      e !== _p$.e && _$setAttribute(_el$111, "aria-label", e);
      _$style(_el$111, t, _p$.t);
      _$className(_el$111, a, false, _p$.a);
    },
    {
      e: undefined,
      t: undefined,
      a: undefined
    }
  );
  return _el$111;
})();
const template88 = (() => {
  var _el$112 = _tmpl$44();
  _$style(_el$112, style);
  _$className(_el$112, style);
  _$insert(_el$112, count);
  _$effect(count, _v$ => {
    _$setAttribute(_el$112, "aria-label", _v$);
  });
  return _el$112;
})();
_$delegateEvents(["click", "input"]);
