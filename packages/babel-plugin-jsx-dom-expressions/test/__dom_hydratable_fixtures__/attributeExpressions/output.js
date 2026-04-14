import { template as _$template } from "r-dom";
import { delegateEvents as _$delegateEvents } from "r-dom";
import { getNextMarker as _$getNextMarker } from "r-dom";
import { insert as _$insert } from "r-dom";
import { memo as _$memo } from "r-dom";
import { addEventListener as _$addEventListener } from "r-dom";
import { style as _$style } from "r-dom";
import { setStyleProperty as _$setStyleProperty } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { effect as _$effect } from "r-dom";
import { setProperty as _$setProperty } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { runHydrationEvents as _$runHydrationEvents } from "r-dom";
import { className as _$className } from "r-dom";
import { ref as _$ref } from "r-dom";
import { spread as _$spread } from "r-dom";
import { mergeProps as _$mergeProps } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<div><h1><a href=/>Welcome`),
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
  _tmpl$14 = /*#__PURE__*/ _$template(`<div style=c:static>`),
  _tmpl$15 = /*#__PURE__*/ _$template(`<div data="&quot;hi&quot;"data2="&quot;">`),
  _tmpl$16 = /*#__PURE__*/ _$template(`<a>`),
  _tmpl$17 = /*#__PURE__*/ _$template(`<div><!$><!/><a>`),
  _tmpl$18 = /*#__PURE__*/ _$template(`<div>Hi`),
  _tmpl$19 = /*#__PURE__*/ _$template(`<label><span>Input is <!$><!/></span><input><div>`),
  _tmpl$20 = /*#__PURE__*/ _$template(
    `<div class="class1 class2 class3 class4 class5 class6"random="random1 random2\n    random3 random4"style="color:red;background-color:blue !important;border:1px solid black;font-size:12px">`
  ),
  _tmpl$21 = /*#__PURE__*/ _$template(`<button>`),
  _tmpl$22 = /*#__PURE__*/ _$template(`<input value=10>`),
  _tmpl$23 = /*#__PURE__*/ _$template(`<select><option>Red</option><option>Blue`),
  _tmpl$24 = /*#__PURE__*/ _$template(`<img src>`),
  _tmpl$25 = /*#__PURE__*/ _$template(`<div><img src>`),
  _tmpl$26 = /*#__PURE__*/ _$template(`<img src loading=lazy>`, 1),
  _tmpl$27 = /*#__PURE__*/ _$template(`<div><img src loading=lazy>`, 1),
  _tmpl$28 = /*#__PURE__*/ _$template(`<iframe src>`),
  _tmpl$29 = /*#__PURE__*/ _$template(`<div><iframe src>`),
  _tmpl$30 = /*#__PURE__*/ _$template(`<iframe src loading=lazy>`, 1),
  _tmpl$31 = /*#__PURE__*/ _$template(`<div><iframe src loading=lazy>`, 1),
  _tmpl$32 = /*#__PURE__*/ _$template(`<div title="<u>data</u>">`),
  _tmpl$33 = /*#__PURE__*/ _$template(`<div true truestr=true truestrjs=true>`),
  _tmpl$34 = /*#__PURE__*/ _$template(`<div falsestr=false falsestrjs=false>`),
  _tmpl$35 = /*#__PURE__*/ _$template(`<div true>`),
  _tmpl$36 = /*#__PURE__*/ _$template(`<div a b c d f=0 g h l>`),
  _tmpl$37 = /*#__PURE__*/ _$template(`<math display=block><mrow>`),
  _tmpl$38 = /*#__PURE__*/ _$template(`<math><mrow><mi>x</mi><mo>=`, 2),
  _tmpl$39 = /*#__PURE__*/ _$template(`<div style=background:red>`),
  _tmpl$40 = /*#__PURE__*/ _$template(
    `<div style=background:red;color:green;margin:3;padding:0.4>`
  ),
  _tmpl$41 = /*#__PURE__*/ _$template(`<div style=background:red;color:green>`),
  _tmpl$42 = /*#__PURE__*/ _$template(`<video>`),
  _tmpl$43 = /*#__PURE__*/ _$template(`<video playsinline>`),
  _tmpl$44 = /*#__PURE__*/ _$template(`<video poster=1.jpg>`),
  _tmpl$45 = /*#__PURE__*/ _$template(`<div><video poster=1.jpg>`),
  _tmpl$46 = /*#__PURE__*/ _$template(`<div><video>`),
  _tmpl$47 = /*#__PURE__*/ _$template(`<button type=button>`),
  _tmpl$48 = /*#__PURE__*/ _$template(`<div style=duplicate2>`);
import * as styles from "./styles.module.css";
import { binding } from "somewhere";
function refFn() {}
const refConst = null;
const selected = true;
let id = "my-h1";
let link;
const template = (() => {
  var _el$ = _$getNextElement(_tmpl$),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.firstChild;
  _$spread(
    _el$,
    _$mergeProps(
      {
        id: "main"
      },
      results,
      {
        class: {
          selected: unknown
        },
        style: {
          color
        }
      }
    ),
    true
  );
  _$spread(
    _el$2,
    _$mergeProps(
      {
        id: "my-h1"
      },
      results,
      {
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
      }
    ),
    true
  );
  var _ref$ = link;
  typeof _ref$ === "function" || Array.isArray(_ref$) ? _$ref(() => _ref$, _el$3) : (link = _el$3);
  _$className(_el$3, {
    "ccc ddd": true
  });
  _$runHydrationEvents();
  return _el$;
})();
const template2 = (() => {
  var _el$4 = _$getNextElement(_tmpl$2),
    _el$5 = _el$4.firstChild,
    _el$6 = _el$5.nextSibling,
    _el$7 = _el$6.firstChild,
    _el$8 = _el$6.nextSibling;
  _$spread(
    _el$4,
    _$mergeProps(() => getProps("test")),
    true
  );
  _$setProperty(_el$5, "textContent", rowId);
  _$setProperty(_el$8, "innerHTML", "<div/>");
  _$effect(
    () => row.label,
    _v$ => {
      _$setProperty(_el$7, "data", _v$);
    }
  );
  _$runHydrationEvents();
  return _el$4;
})();
const template3 = (() => {
  var _el$9 = _$getNextElement(_tmpl$3);
  _$setAttribute(_el$9, "id", state.id);
  _$setStyleProperty(_el$9, "background-color", state.color);
  _$setProperty(_el$9, "textContent", state.content);
  _$effect(
    () => state.name,
    _v$ => {
      _$setAttribute(_el$9, "name", _v$);
    }
  );
  return _el$9;
})();
const template4 = (() => {
  var _el$10 = _$getNextElement(_tmpl$4);
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
const template5 = _$getNextElement(_tmpl$5);
const template6 = (() => {
  var _el$12 = _$getNextElement(_tmpl$4);
  _$setProperty(_el$12, "textContent", "Hi");
  _$effect(someStyle, (_v$, _$p) => {
    _$style(_el$12, _v$, _$p);
  });
  return _el$12;
})();
let undefVar;
const template7 = (() => {
  var _el$13 = _$getNextElement(_tmpl$6);
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
  var _el$14 = _$getNextElement(_tmpl$4);
  var _ref$2 = refTarget;
  typeof _ref$2 === "function" || Array.isArray(_ref$2)
    ? _$ref(() => _ref$2, _el$14)
    : (refTarget = _el$14);
  return _el$14;
})();
const template9 = (() => {
  var _el$15 = _$getNextElement(_tmpl$4);
  _$ref(() => e => console.log(e), _el$15);
  return _el$15;
})();
const template10 = (() => {
  var _el$16 = _$getNextElement(_tmpl$4);
  var _ref$3 = refFactory();
  (typeof _ref$3 === "function" || Array.isArray(_ref$3)) && _$ref(() => _ref$3, _el$16);
  return _el$16;
})();
const template12 = (() => {
  var _el$17 = _$getNextElement(_tmpl$7);
  _el$17.htmlFor = thing;
  _el$17.number = 123;
  return _el$17;
})();
const template13 = _$getNextElement(_tmpl$8);
const template14 = (() => {
  var _el$19 = _$getNextElement(_tmpl$9);
  _$effect(
    () => state.visible,
    _v$ => {
      _el$19.checked = _v$;
    }
  );
  return _el$19;
})();
const template15 = _$getNextElement(_tmpl$10);
const template16 = (() => {
  var _el$21 = _$getNextElement(_tmpl$11);
  _$className(_el$21, [
    "static",
    {
      hi: "k"
    }
  ]);
  return _el$21;
})();
const template17 = (() => {
  var _el$22 = _$getNextElement(_tmpl$12);
  _$addEventListener(_el$22, "click", increment, true);
  _$runHydrationEvents();
  return _el$22;
})();
const template18 = (() => {
  var _el$23 = _$getNextElement(_tmpl$4);
  _$spread(
    _el$23,
    _$mergeProps(() => ({
      get [key()]() {
        return props.value;
      }
    })),
    false
  );
  _$runHydrationEvents();
  return _el$23;
})();
const template19 = (() => {
  var _el$24 = _$getNextElement(_tmpl$4);
  _$className(_el$24, [
    {
      "bg-red-500": true
    },
    "flex flex-col"
  ]);
  return _el$24;
})();
const template20 = (() => {
  var _el$25 = _$getNextElement(_tmpl$13),
    _el$26 = _el$25.firstChild,
    _el$27 = _el$26.nextSibling;
  _$addEventListener(_el$26, "input", doSomething, true);
  _$addEventListener(_el$27, "input", doSomethingElse, true);
  _$setAttribute(_el$27, "readonly", value);
  _$effect(
    () => ({
      e: min(),
      t: max(),
      a: min(),
      o: max()
    }),
    ({ e, t, a, o }, _p$) => {
      e !== _p$.e && _$setAttribute(_el$26, "min", e);
      t !== _p$.t && _$setAttribute(_el$26, "max", t);
      a !== _p$.a && _$setAttribute(_el$27, "min", a);
      o !== _p$.o && _$setAttribute(_el$27, "max", o);
    },
    {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    }
  );
  _$effect(s, _v$ => {
    _el$26.value = _v$ ?? "";
  });
  _$effect(s2, _v$ => {
    _el$27.checked = _v$;
  });
  _$runHydrationEvents();
  return _el$25;
})();
const template21 = (() => {
  var _el$28 = _$getNextElement(_tmpl$14);
  _$effect(
    () => ({
      ...rest
    }),
    (_v$, _$p) => {
      _$style(_el$28, _v$, _$p);
    }
  );
  return _el$28;
})();
const template22 = _$getNextElement(_tmpl$15);
const template23 = (() => {
  var _el$30 = _$getNextElement(_tmpl$4);
  _$insert(_el$30, () => "t" in test && "true");
  _$effect(
    () => "t" in test,
    _v$ => {
      _$setAttribute(_el$30, "disabled", _v$);
    }
  );
  return _el$30;
})();
const template24 = (() => {
  var _el$31 = _$getNextElement(_tmpl$16);
  _$spread(
    _el$31,
    _$mergeProps(props, {
      something: true
    }),
    false
  );
  _$runHydrationEvents();
  return _el$31;
})();
const template25 = (() => {
  var _el$32 = _$getNextElement(_tmpl$17),
    _el$34 = _el$32.firstChild,
    [_el$35, _co$] = _$getNextMarker(_el$34.nextSibling),
    _el$33 = _el$35.nextSibling;
  _$insert(_el$32, () => props.children, _el$35, _co$);
  _$spread(
    _el$33,
    _$mergeProps(props, {
      something: true
    }),
    false
  );
  _$runHydrationEvents();
  return _el$32;
})();
const template26 = (() => {
  var _el$36 = _$getNextElement(_tmpl$18);
  _$spread(
    _el$36,
    _$mergeProps(
      {
        start: "Hi",
        middle: middle
      },
      spread
    ),
    true
  );
  _$runHydrationEvents();
  return _el$36;
})();
const template27 = (() => {
  var _el$37 = _$getNextElement(_tmpl$18);
  _$spread(
    _el$37,
    _$mergeProps(
      {
        start: "Hi"
      },
      first,
      {
        middle: middle
      },
      second
    ),
    true
  );
  _$runHydrationEvents();
  return _el$37;
})();
const template28 = (() => {
  var _el$38 = _$getNextElement(_tmpl$19),
    _el$39 = _el$38.firstChild,
    _el$40 = _el$39.firstChild,
    _el$41 = _el$40.nextSibling,
    [_el$42, _co$2] = _$getNextMarker(_el$41.nextSibling),
    _el$43 = _el$39.nextSibling,
    _el$44 = _el$43.nextSibling;
  _$spread(_el$38, _$mergeProps(api), true);
  _$spread(_el$39, _$mergeProps(api), true);
  _$insert(_el$39, () => (api() ? "checked" : "unchecked"), _el$42, _co$2);
  _$spread(_el$43, _$mergeProps(api), false);
  _$spread(_el$44, _$mergeProps(api), false);
  _$runHydrationEvents();
  return _el$38;
})();
const template29 = (() => {
  var _el$45 = _$getNextElement(_tmpl$4);
  _$setAttribute(_el$45, "attribute", !!someValue);
  _$insert(_el$45, !!someValue);
  return _el$45;
})();
const template30 = _$getNextElement(_tmpl$20);
const template31 = (() => {
  var _el$47 = _$getNextElement(_tmpl$4);
  _$effect(
    () => getStore.itemProperties.color,
    _v$ => {
      _$setStyleProperty(_el$47, "background-color", _v$);
    }
  );
  return _el$47;
})();
const template32 = _$getNextElement(_tmpl$4);
const template33 = [
  (() => {
    var _el$49 = _$getNextElement(_tmpl$21);
    _$effect(
      () => styles.button,
      (_v$, _$p) => {
        _$className(_el$49, _v$, _$p);
      }
    );
    return _el$49;
  })(),
  (() => {
    var _el$50 = _$getNextElement(_tmpl$21);
    _$effect(
      () => styles["foo--bar"],
      (_v$, _$p) => {
        _$className(_el$50, _v$, _$p);
      }
    );
    return _el$50;
  })(),
  (() => {
    var _el$51 = _$getNextElement(_tmpl$21);
    _$effect(
      () => styles.foo.bar,
      (_v$, _$p) => {
        _$className(_el$51, _v$, _$p);
      }
    );
    return _el$51;
  })(),
  (() => {
    var _el$52 = _$getNextElement(_tmpl$21);
    _$effect(
      () => styles[foo()],
      (_v$, _$p) => {
        _$className(_el$52, _v$, _$p);
      }
    );
    return _el$52;
  })()
];
const template35 = (() => {
  var _el$53 = _$getNextElement(_tmpl$4);
  var _ref$4 = a().b.c;
  typeof _ref$4 === "function" || Array.isArray(_ref$4)
    ? _$ref(() => _ref$4, _el$53)
    : (a().b.c = _el$53);
  return _el$53;
})();
const template36 = (() => {
  var _el$54 = _$getNextElement(_tmpl$4);
  var _ref$5 = a().b?.c;
  (typeof _ref$5 === "function" || Array.isArray(_ref$5)) && _$ref(() => _ref$5, _el$54);
  return _el$54;
})();
const template37 = (() => {
  var _el$55 = _$getNextElement(_tmpl$4);
  var _ref$6 = a() ? b : c;
  (typeof _ref$6 === "function" || Array.isArray(_ref$6)) && _$ref(() => _ref$6, _el$55);
  return _el$55;
})();
const template38 = (() => {
  var _el$56 = _$getNextElement(_tmpl$4);
  var _ref$7 = a() ?? b;
  (typeof _ref$7 === "function" || Array.isArray(_ref$7)) && _$ref(() => _ref$7, _el$56);
  return _el$56;
})();
const template39 = _$getNextElement(_tmpl$22);
const template40 = (() => {
  var _el$58 = _$getNextElement(_tmpl$4);
  _$effect(a, _v$ => {
    _$setStyleProperty(_el$58, "color", _v$);
  });
  return _el$58;
})();
const template41 = (() => {
  var _el$59 = _$getNextElement(_tmpl$23),
    _el$60 = _el$59.firstChild,
    _el$61 = _el$60.nextSibling;
  _$effect(
    () => state.color,
    _v$ => {
      _$setAttribute(_el$59, "value", _v$);
    }
  );
  _$effect(
    () => Color.Red,
    _v$ => {
      _el$60.value = _v$;
    }
  );
  _$effect(
    () => Color.Blue,
    _v$ => {
      _el$61.value = _v$;
    }
  );
  return _el$59;
})();
const template42 = _$getNextElement(_tmpl$24);
const template43 = _$getNextElement(_tmpl$25);
const template44 = _$getNextElement(_tmpl$26);
const template45 = _$getNextElement(_tmpl$27);
const template46 = _$getNextElement(_tmpl$28);
const template47 = _$getNextElement(_tmpl$29);
const template48 = _$getNextElement(_tmpl$30);
const template49 = _$getNextElement(_tmpl$31);
const template50 = _$getNextElement(_tmpl$32);
const template51 = (() => {
  var _el$71 = _$getNextElement(_tmpl$4);
  _$ref(() => binding, _el$71);
  return _el$71;
})();
const template52 = (() => {
  var _el$72 = _$getNextElement(_tmpl$4);
  var _ref$8 = binding.prop;
  typeof _ref$8 === "function" || Array.isArray(_ref$8)
    ? _$ref(() => _ref$8, _el$72)
    : (binding.prop = _el$72);
  return _el$72;
})();
const template53 = (() => {
  var _el$73 = _$getNextElement(_tmpl$4);
  var _ref$9 = refFn;
  typeof _ref$9 === "function" || Array.isArray(_ref$9)
    ? _$ref(() => _ref$9, _el$73)
    : (refFn = _el$73);
  return _el$73;
})();
const template54 = (() => {
  var _el$74 = _$getNextElement(_tmpl$4);
  _$ref(() => refConst, _el$74);
  return _el$74;
})();
const template55 = (() => {
  var _el$75 = _$getNextElement(_tmpl$4);
  var _ref$10 = refUnknown;
  typeof _ref$10 === "function" || Array.isArray(_ref$10)
    ? _$ref(() => _ref$10, _el$75)
    : (refUnknown = _el$75);
  return _el$75;
})();
const template56 = _$getNextElement(_tmpl$33);
const template57 = _$getNextElement(_tmpl$34);
const template58 = (() => {
  var _el$78 = _$getNextElement(_tmpl$4);
  _el$78.true = true;
  _el$78.false = false;
  return _el$78;
})();
const template59 = _$getNextElement(_tmpl$35);
const template60 = (() => {
  var _el$80 = _$getNextElement(_tmpl$36);
  _$setAttribute(_el$80, "i", undefined);
  _$setAttribute(_el$80, "j", null);
  _$setAttribute(_el$80, "k", void 0);
  return _el$80;
})();
const template61 = _$getNextElement(_tmpl$37);
const template62 = _$getNextElement(_tmpl$38);
const template63 = _$getNextElement(_tmpl$39);
const template64 = _$getNextElement(_tmpl$40);
const template65 = _$getNextElement(_tmpl$41);
const template66 = (() => {
  var _el$86 = _$getNextElement(_tmpl$41);
  _$effect(signal, _v$ => {
    _$setStyleProperty(_el$86, "border", _v$);
  });
  return _el$86;
})();
const template67 = (() => {
  var _el$87 = _$getNextElement(_tmpl$41);
  _$setStyleProperty(_el$87, "border", somevalue);
  return _el$87;
})();
const template68 = (() => {
  var _el$88 = _$getNextElement(_tmpl$41);
  _$effect(
    () => some.access,
    _v$ => {
      _$setStyleProperty(_el$88, "border", _v$);
    }
  );
  return _el$88;
})();
const template69 = _$getNextElement(_tmpl$41);
const template70 = (() => {
  var _el$90 = _$getNextElement(_tmpl$42);
  _$setAttribute(_el$90, "playsinline", value);
  return _el$90;
})();
const template71 = _$getNextElement(_tmpl$43);
const template72 = _$getNextElement(_tmpl$42);
const template73 = _$getNextElement(_tmpl$44);
const template74 = _$getNextElement(_tmpl$45);
const template75 = (() => {
  var _el$95 = _$getNextElement(_tmpl$42);
  _el$95.poster = "1.jpg";
  return _el$95;
})();
const template76 = (() => {
  var _el$96 = _$getNextElement(_tmpl$46),
    _el$97 = _el$96.firstChild;
  _el$97.poster = "1.jpg";
  return _el$96;
})();

// ONCE TESTS

const template77 = (() => {
  var _el$98 = _$getNextElement(_tmpl$4);
  _$setStyleProperty(_el$98, "width", props.width);
  _$setStyleProperty(_el$98, "height", props.height);
  return _el$98;
})();
const template78 = (() => {
  var _el$99 = _$getNextElement(_tmpl$4);
  _$setStyleProperty(_el$99, "width", props.width);
  _$setStyleProperty(_el$99, "height", props.height);
  _$effect(color, _v$ => {
    _$setAttribute(_el$99, "something", _v$);
  });
  return _el$99;
})();
const template79 = (() => {
  var _el$100 = _$getNextElement(_tmpl$4);
  _$setStyleProperty(_el$100, "height", props.height);
  _$setAttribute(_el$100, "something", color());
  _$effect(
    () => props.width,
    _v$ => {
      _$setStyleProperty(_el$100, "width", _v$);
    }
  );
  return _el$100;
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
  var _el$101 = _$getNextElement(_tmpl$4);
  _$spread(_el$101, propsSpread, false);
  _$runHydrationEvents();
  return _el$101;
})();
const template81 = (() => {
  var _el$102 = _$getNextElement(_tmpl$4);
  _$spread(
    _el$102,
    {
      ...propsSpread
    },
    false
  );
  _$runHydrationEvents();
  return _el$102;
})();
const template82 = (() => {
  var _el$103 = _$getNextElement(_tmpl$4);
  _$spread(
    _el$103,
    _$mergeProps(propsSpread, {
      get ["data-dynamic"]() {
        return color();
      },
      "data-static": color()
    }),
    false
  );
  _$runHydrationEvents();
  return _el$103;
})();
const template83 = (() => {
  var _el$104 = _$getNextElement(_tmpl$4);
  _$spread(
    _el$104,
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
    false
  );
  _$runHydrationEvents();
  return _el$104;
})();
const template84 = (() => {
  var _el$105 = _$getNextElement(_tmpl$4);
  _$spread(
    _el$105,
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
    false
  );
  _$runHydrationEvents();
  return _el$105;
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
  var _el$106 = _$getNextElement(_tmpl$4);
  _$style(_el$106, styleProp.style);
  return _el$106;
})();
const template86 = (() => {
  var _el$107 = _$getNextElement(_tmpl$4);
  _$effect(
    () => styleProp.style,
    (_v$, _$p) => {
      _$style(_el$107, _v$, _$p);
    }
  );
  return _el$107;
})();
const style = {
  background: "red",
  border: "solid black " + count() + "px"
};
const template87 = (() => {
  var _el$108 = _$getNextElement(_tmpl$47);
  _$insert(_el$108, count);
  _$effect(
    () => ({
      e: count(),
      t: style,
      a: style
    }),
    ({ e, t, a }, _p$) => {
      e !== _p$.e && _$setAttribute(_el$108, "aria-label", e);
      _$style(_el$108, t, _p$.t);
      _$className(_el$108, a, _p$.a);
    },
    {
      e: undefined,
      t: undefined,
      a: undefined
    }
  );
  return _el$108;
})();
const template88 = (() => {
  var _el$109 = _$getNextElement(_tmpl$47);
  _$style(_el$109, style);
  _$className(_el$109, style);
  _$insert(_el$109, count);
  _$effect(count, _v$ => {
    _$setAttribute(_el$109, "aria-label", _v$);
  });
  return _el$109;
})();
const template89 = _$getNextElement(_tmpl$48);
_$delegateEvents(["click", "input"]);