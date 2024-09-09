import { template as _$template } from "r-dom";
import { delegateEvents as _$delegateEvents } from "r-dom";
import { setBoolAttribute as _$setBoolAttribute } from "r-dom";
import { insert as _$insert } from "r-dom";
import { memo as _$memo } from "r-dom";
import { addEventListener as _$addEventListener } from "r-dom";
import { style as _$style } from "r-dom";
import { className as _$className } from "r-dom";
import { setAttribute as _$setAttribute } from "r-dom";
import { effect as _$effect } from "r-dom";
import { classList as _$classList } from "r-dom";
import { use as _$use } from "r-dom";
import { spread as _$spread } from "r-dom";
import { mergeProps as _$mergeProps } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<div id=main><h1 class=base id=my-h1><a href=/>Welcome`),
  _tmpl$2 = /*#__PURE__*/ _$template(`<div><div></div><div> </div><div>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<div foo>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$5 = /*#__PURE__*/ _$template(`<div class="a b">`),
  _tmpl$6 = /*#__PURE__*/ _$template(`<input type=checkbox>`),
  _tmpl$7 = /*#__PURE__*/ _$template(`<div class="\`a">\`$\``),
  _tmpl$8 = /*#__PURE__*/ _$template(`<button class="static hi"type=button>Write`),
  _tmpl$9 = /*#__PURE__*/ _$template(`<button class="a b c">Hi`),
  _tmpl$10 = /*#__PURE__*/ _$template(`<div class="bg-red-500 flex flex-col">`),
  _tmpl$11 = /*#__PURE__*/ _$template(`<div><input readonly=""><input>`),
  _tmpl$12 = /*#__PURE__*/ _$template(`<div data="&quot;hi&quot;"data2="&quot;">`),
  _tmpl$13 = /*#__PURE__*/ _$template(`<a>`),
  _tmpl$14 = /*#__PURE__*/ _$template(`<div><a>`),
  _tmpl$15 = /*#__PURE__*/ _$template(`<div start=Hi>Hi`),
  _tmpl$16 = /*#__PURE__*/ _$template(`<label><span>Input is </span><input><div>`),
  _tmpl$17 = /*#__PURE__*/ _$template(
    `<div class="class1 class2 class3 class4 class5 class6"style="color:red;background-color:blue !important;border:1px solid black;font-size:12px;"random="random1 random2\n    random3 random4">`
  ),
  _tmpl$18 = /*#__PURE__*/ _$template(`<button>`),
  _tmpl$19 = /*#__PURE__*/ _$template(`<input value=10>`),
  _tmpl$20 = /*#__PURE__*/ _$template(`<select><option>Red</option><option>Blue`),
  _tmpl$21 = /*#__PURE__*/ _$template(`<div>empty string`),
  _tmpl$22 = /*#__PURE__*/ _$template(`<div>js empty`),
  _tmpl$23 = /*#__PURE__*/ _$template(`<div quack>hola`),
  _tmpl$24 = /*#__PURE__*/ _$template(`<div quack>"hola js"`),
  _tmpl$25 = /*#__PURE__*/ _$template(`<div quack>true`),
  _tmpl$26 = /*#__PURE__*/ _$template(`<div>false`),
  _tmpl$27 = /*#__PURE__*/ _$template(`<div quack>1`),
  _tmpl$28 = /*#__PURE__*/ _$template(`<div>0`),
  _tmpl$29 = /*#__PURE__*/ _$template(`<div quack>"1"`),
  _tmpl$30 = /*#__PURE__*/ _$template(`<div>"0"`),
  _tmpl$31 = /*#__PURE__*/ _$template(`<div>undefined`),
  _tmpl$32 = /*#__PURE__*/ _$template(`<div>null`),
  _tmpl$33 = /*#__PURE__*/ _$template(`<div>boolTest()`),
  _tmpl$34 = /*#__PURE__*/ _$template(`<div>boolTest`),
  _tmpl$35 = /*#__PURE__*/ _$template(`<div>boolTestBinding`),
  _tmpl$36 = /*#__PURE__*/ _$template(`<div>boolTestObjBinding.value`),
  _tmpl$37 = /*#__PURE__*/ _$template(`<div>fn`),
  _tmpl$38 = /*#__PURE__*/ _$template(`<div before quack>should have space before`),
  _tmpl$39 = /*#__PURE__*/ _$template(`<div before quack after>should have space before/after`),
  _tmpl$40 = /*#__PURE__*/ _$template(`<div quack after>should have space before/after`),
  _tmpl$41 = /*#__PURE__*/ _$template(`<img src="">`),
  _tmpl$42 = /*#__PURE__*/ _$template(`<div><img src="">`),
  _tmpl$43 = /*#__PURE__*/ _$template(`<img src=""loading=lazy>`, true, false),
  _tmpl$44 = /*#__PURE__*/ _$template(`<div><img src=""loading=lazy>`, true, false),
  _tmpl$45 = /*#__PURE__*/ _$template(`<iframe src="">`),
  _tmpl$46 = /*#__PURE__*/ _$template(`<div><iframe src="">`),
  _tmpl$47 = /*#__PURE__*/ _$template(`<iframe src=""loading=lazy>`, true, false),
  _tmpl$48 = /*#__PURE__*/ _$template(`<div><iframe src=""loading=lazy>`, true, false);
import * as styles from "./styles.module.css";
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
      classList: {
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
      get classList() {
        return {
          dynamic: dynamic(),
          selected
        };
      }
    }),
    false,
    true
  );
  var _ref$ = link;
  typeof _ref$ === "function" ? _$use(_ref$, _el$3) : (link = _el$3);
  _$classList(_el$3, {
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
  _$effect(() => (_el$7.data = row.label));
  return _el$4;
})();
const template3 = (() => {
  var _el$9 = _tmpl$3();
  _$setAttribute(_el$9, "id", state.id);
  state.color != null
    ? _el$9.style.setProperty("background-color", state.color)
    : _el$9.style.removeProperty("background-color");
  _el$9.textContent = state.content;
  _$effect(() => _$setAttribute(_el$9, "name", state.name));
  return _el$9;
})();
const template4 = (() => {
  var _el$10 = _tmpl$4();
  _$classList(_el$10, {
    "ccc:ddd": true
  });
  _$effect(() => _$className(_el$10, `hi ${state.class || ""}`));
  return _el$10;
})();
const template5 = _tmpl$5();
const template6 = (() => {
  var _el$12 = _tmpl$4();
  _el$12.textContent = "Hi";
  _$effect(_$p => _$style(_el$12, someStyle(), _$p));
  return _el$12;
})();
let undefVar;
const template7 = (() => {
  var _el$13 = _tmpl$4();
  _el$13.classList.toggle("other-class", !!undefVar);
  _el$13.classList.toggle("other-class2", !!undefVar);
  _$effect(
    _p$ => {
      var _v$ = {
          "background-color": color(),
          "margin-right": "40px",
          ...props.style
        },
        _v$2 = props.top,
        _v$3 = !!props.active;
      _p$.e = _$style(_el$13, _v$, _p$.e);
      _v$2 !== _p$.t &&
        ((_p$.t = _v$2) != null
          ? _el$13.style.setProperty("padding-top", _v$2)
          : _el$13.style.removeProperty("padding-top"));
      _v$3 !== _p$.a && _el$13.classList.toggle("my-class", (_p$.a = _v$3));
      return _p$;
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
  var _el$18 = _tmpl$4();
  _el$18.htmlFor = thing;
  _el$18.number = 123;
  _$setAttribute(_el$18, "onclick", "console.log('hi')");
  return _el$18;
})();
const template13 = (() => {
  var _el$19 = _tmpl$6();
  _el$19.checked = true;
  return _el$19;
})();
const template14 = (() => {
  var _el$20 = _tmpl$6();
  _$effect(() => (_el$20.checked = state.visible));
  return _el$20;
})();
const template15 = _tmpl$7();
const template16 = _tmpl$8();
const template17 = (() => {
  var _el$23 = _tmpl$9();
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
const template19 = _tmpl$10();
const template20 = (() => {
  var _el$26 = _tmpl$11(),
    _el$27 = _el$26.firstChild,
    _el$28 = _el$27.nextSibling;
  _$addEventListener(_el$27, "input", doSomething, true);
  _$addEventListener(_el$28, "input", doSomethingElse, true);
  _el$28.readOnly = value;
  _$effect(
    _p$ => {
      var _v$4 = min(),
        _v$5 = max(),
        _v$6 = min(),
        _v$7 = max();
      _v$4 !== _p$.e && _$setAttribute(_el$27, "min", (_p$.e = _v$4));
      _v$5 !== _p$.t && _$setAttribute(_el$27, "max", (_p$.t = _v$5));
      _v$6 !== _p$.a && _$setAttribute(_el$28, "min", (_p$.a = _v$6));
      _v$7 !== _p$.o && _$setAttribute(_el$28, "max", (_p$.o = _v$7));
      return _p$;
    },
    {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    }
  );
  _$effect(() => (_el$27.value = s()));
  _$effect(() => (_el$28.checked = s2()));
  return _el$26;
})();
const template21 = (() => {
  var _el$29 = _tmpl$4();
  _$effect(_$p =>
    _$style(
      _el$29,
      {
        a: "static",
        ...rest
      },
      _$p
    )
  );
  return _el$29;
})();
const template22 = _tmpl$12();
const template23 = (() => {
  var _el$31 = _tmpl$4();
  _$insert(_el$31, () => "t" in test && "true");
  _$effect(() => (_el$31.disabled = "t" in test));
  return _el$31;
})();
const template24 = (() => {
  var _el$32 = _tmpl$13();
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
  var _el$33 = _tmpl$14(),
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
  var _el$35 = _tmpl$15();
  _$setAttribute(_el$35, "middle", middle);
  _$spread(_el$35, spread, false, true);
  return _el$35;
})();
const template27 = (() => {
  var _el$36 = _tmpl$15();
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
  var _el$37 = _tmpl$16(),
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
const template30 = _tmpl$17();
const template31 = (() => {
  var _el$44 = _tmpl$4();
  _$effect(_$p =>
    (_$p = getStore.itemProperties.color) != null
      ? _el$44.style.setProperty("background-color", _$p)
      : _el$44.style.removeProperty("background-color")
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
    var _el$46 = _tmpl$18();
    _$className(_el$46, styles.button);
    return _el$46;
  })(),
  (() => {
    var _el$47 = _tmpl$18();
    _$className(_el$47, styles["foo--bar"]);
    return _el$47;
  })(),
  (() => {
    var _el$48 = _tmpl$18();
    _$effect(() => _$className(_el$48, styles.foo.bar));
    return _el$48;
  })(),
  (() => {
    var _el$49 = _tmpl$18();
    _$effect(() => _$className(_el$49, styles[foo()]));
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
const template39 = _tmpl$19();
const template40 = (() => {
  var _el$56 = _tmpl$4();
  _$effect(_$p =>
    (_$p = a()) != null
      ? _el$56.style.setProperty("color", _$p)
      : _el$56.style.removeProperty("color")
  );
  return _el$56;
})();
const template41 = (() => {
  var _el$57 = _tmpl$20(),
    _el$58 = _el$57.firstChild,
    _el$59 = _el$58.nextSibling;
  _$effect(() => (_el$58.value = Color.Red));
  _$effect(() => (_el$59.value = Color.Blue));
  _$effect(() => (_el$57.value = state.color));
  return _el$57;
})();

// bool:
function boolTest() {
  return true;
}
const boolTestBinding = false;
const boolTestObjBinding = {
  value: false
};
const template42 = _tmpl$21();
const template43 = _tmpl$22();
const template44 = _tmpl$23();
const template45 = _tmpl$24();
const template46 = _tmpl$25();
const template47 = _tmpl$26();
const template48 = _tmpl$27();
const template49 = _tmpl$28();
const template50 = _tmpl$29();
const template51 = _tmpl$30();
const template52 = _tmpl$31();
const template53 = _tmpl$32();
const template54 = (() => {
  var _el$72 = _tmpl$33();
  _$effect(() => _$setBoolAttribute(_el$72, "quack", boolTest()));
  return _el$72;
})();
const template55 = (() => {
  var _el$73 = _tmpl$34();
  _$setBoolAttribute(_el$73, "quack", boolTest);
  return _el$73;
})();
const template56 = (() => {
  var _el$74 = _tmpl$35();
  _$setBoolAttribute(_el$74, "quack", boolTestBinding);
  return _el$74;
})();
const template57 = (() => {
  var _el$75 = _tmpl$36();
  _$effect(() => _$setBoolAttribute(_el$75, "quack", boolTestObjBinding.value));
  return _el$75;
})();
const template58 = (() => {
  var _el$76 = _tmpl$37();
  _$setBoolAttribute(_el$76, "quack", () => false);
  return _el$76;
})();
const template59 = _tmpl$38();
const template60 = _tmpl$39();
const template61 = _tmpl$40();
// this crash it for some reason- */ const template62 = <div bool:quack>really empty</div>;

const template63 = _tmpl$41();
const template64 = _tmpl$42();
const template65 = _tmpl$43();
const template66 = _tmpl$44();
const template67 = _tmpl$45();
const template68 = _tmpl$46();
const template69 = _tmpl$47();
const template70 = _tmpl$48();
_$delegateEvents(["click", "input"]);
