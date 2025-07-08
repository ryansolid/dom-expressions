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
var _tmpl$ = /*#__PURE__*/ _$template(
    `<div id="main"><h1 class="base"id="my-h1"><a href="/">Welcome</a></h1></div>`
  ),
  _tmpl$2 = /*#__PURE__*/ _$template(`<div><div></div><div> </div><div></div></div>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<div foo></div>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<div></div>`),
  _tmpl$5 = /*#__PURE__*/ _$template(`<div class="a b"></div>`),
  _tmpl$6 = /*#__PURE__*/ _$template(`<input type="checkbox">`),
  _tmpl$7 = /*#__PURE__*/ _$template(`<div class="\`a">\`$\`</div>`),
  _tmpl$8 = /*#__PURE__*/ _$template(`<button class="static hi"type="button">Write</button>`),
  _tmpl$9 = /*#__PURE__*/ _$template(`<button class="a b c">Hi</button>`),
  _tmpl$0 = /*#__PURE__*/ _$template(`<div class="bg-red-500 flex flex-col"></div>`),
  _tmpl$1 = /*#__PURE__*/ _$template(`<div><input readonly><input></div>`),
  _tmpl$10 = /*#__PURE__*/ _$template(`<div data="&quot;hi&quot;"data2="&quot;"></div>`),
  _tmpl$11 = /*#__PURE__*/ _$template(`<a></a>`),
  _tmpl$12 = /*#__PURE__*/ _$template(`<div><a></a></div>`),
  _tmpl$13 = /*#__PURE__*/ _$template(`<div start="Hi">Hi</div>`),
  _tmpl$14 = /*#__PURE__*/ _$template(`<label><span>Input is </span><input><div></div></label>`),
  _tmpl$15 = /*#__PURE__*/ _$template(
    `<div class="class1 class2 class3 class4 class5 class6"style="color:red;background-color:blue !important;border:1px solid black;font-size:12px;"random="random1 random2\n    random3 random4"></div>`
  ),
  _tmpl$16 = /*#__PURE__*/ _$template(`<button></button>`),
  _tmpl$17 = /*#__PURE__*/ _$template(`<input value="10">`),
  _tmpl$18 = /*#__PURE__*/ _$template(`<select><option>Red</option><option>Blue</option></select>`),
  _tmpl$19 = /*#__PURE__*/ _$template(`<div>empty string</div>`),
  _tmpl$20 = /*#__PURE__*/ _$template(`<div>js empty</div>`),
  _tmpl$21 = /*#__PURE__*/ _$template(`<div quack>hola</div>`),
  _tmpl$22 = /*#__PURE__*/ _$template(`<div quack>"hola js"</div>`),
  _tmpl$23 = /*#__PURE__*/ _$template(`<div quack>true</div>`),
  _tmpl$24 = /*#__PURE__*/ _$template(`<div>false</div>`),
  _tmpl$25 = /*#__PURE__*/ _$template(`<div quack>1</div>`),
  _tmpl$26 = /*#__PURE__*/ _$template(`<div>0</div>`),
  _tmpl$27 = /*#__PURE__*/ _$template(`<div quack>"1"</div>`),
  _tmpl$28 = /*#__PURE__*/ _$template(`<div>"0"</div>`),
  _tmpl$29 = /*#__PURE__*/ _$template(`<div>undefined</div>`),
  _tmpl$30 = /*#__PURE__*/ _$template(`<div>null</div>`),
  _tmpl$31 = /*#__PURE__*/ _$template(`<div>boolTest()</div>`),
  _tmpl$32 = /*#__PURE__*/ _$template(`<div>boolTest</div>`),
  _tmpl$33 = /*#__PURE__*/ _$template(`<div>boolTestBinding</div>`),
  _tmpl$34 = /*#__PURE__*/ _$template(`<div>boolTestObjBinding.value</div>`),
  _tmpl$35 = /*#__PURE__*/ _$template(`<div>fn</div>`),
  _tmpl$36 = /*#__PURE__*/ _$template(`<div before quack>should have space before</div>`),
  _tmpl$37 = /*#__PURE__*/ _$template(
    `<div before quack after>should have space before/after</div>`
  ),
  _tmpl$38 = /*#__PURE__*/ _$template(`<div quack after>should have space before/after</div>`),
  _tmpl$39 = /*#__PURE__*/ _$template(`<img src>`),
  _tmpl$40 = /*#__PURE__*/ _$template(`<div><img src></div>`),
  _tmpl$41 = /*#__PURE__*/ _$template(`<img src loading="lazy">`, true, false, false),
  _tmpl$42 = /*#__PURE__*/ _$template(`<div><img src loading="lazy"></div>`, true, false, false),
  _tmpl$43 = /*#__PURE__*/ _$template(`<iframe src></iframe>`),
  _tmpl$44 = /*#__PURE__*/ _$template(`<div><iframe src></iframe></div>`),
  _tmpl$45 = /*#__PURE__*/ _$template(`<iframe src loading="lazy"></iframe>`, true, false, false),
  _tmpl$46 = /*#__PURE__*/ _$template(
    `<div><iframe src loading="lazy"></iframe></div>`,
    true,
    false,
    false
  ),
  _tmpl$47 = /*#__PURE__*/ _$template(`<div title="<u>data</u>"></div>`),
  _tmpl$48 = /*#__PURE__*/ _$template(`<div truestr="true"truestrjs="true"></div>`),
  _tmpl$49 = /*#__PURE__*/ _$template(`<div falsestr="false"falsestrjs="false"></div>`),
  _tmpl$50 = /*#__PURE__*/ _$template(
    `<math display="block"><mrow></mrow></math>`,
    false,
    false,
    true
  ),
  _tmpl$51 = /*#__PURE__*/ _$template(`<mrow><mi>x</mi><mo>=</mo></mrow>`, false, false, true),
  _tmpl$52 = /*#__PURE__*/ _$template(`<video poster="1.jpg"></video>`),
  _tmpl$53 = /*#__PURE__*/ _$template(`<div><video poster="1.jpg"></video></div>`),
  _tmpl$54 = /*#__PURE__*/ _$template(`<video></video>`),
  _tmpl$55 = /*#__PURE__*/ _$template(`<div><video></video></div>`),
  _tmpl$56 = /*#__PURE__*/ _$template(`<video poster></video>`),
  _tmpl$57 = /*#__PURE__*/ _$template(`<div><video poster></video></div>`);
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
  var _el$0 = _tmpl$4();
  _$classList(_el$0, {
    "ccc:ddd": true
  });
  _$effect(() => _$className(_el$0, `hi ${state.class || ""}`));
  return _el$0;
})();
const template5 = _tmpl$5();
const template6 = (() => {
  var _el$10 = _tmpl$4();
  _el$10.textContent = "Hi";
  _$effect(_$p => _$style(_el$10, someStyle(), _$p));
  return _el$10;
})();
let undefVar;
const template7 = (() => {
  var _el$11 = _tmpl$4();
  _el$11.classList.toggle("other-class", !!undefVar);
  _el$11.classList.toggle("other-class2", !!undefVar);
  _$effect(
    _p$ => {
      var _v$ = {
          "background-color": color(),
          "margin-right": "40px",
          ...props.style
        },
        _v$2 = props.top,
        _v$3 = !!props.active;
      _p$.e = _$style(_el$11, _v$, _p$.e);
      _v$2 !== _p$.t &&
        ((_p$.t = _v$2) != null
          ? _el$11.style.setProperty("padding-top", _v$2)
          : _el$11.style.removeProperty("padding-top"));
      _v$3 !== _p$.a && _el$11.classList.toggle("my-class", (_p$.a = _v$3));
      return _p$;
    },
    {
      e: undefined,
      t: undefined,
      a: undefined
    }
  );
  return _el$11;
})();
let refTarget;
const template8 = (() => {
  var _el$12 = _tmpl$4();
  var _ref$2 = refTarget;
  typeof _ref$2 === "function" ? _$use(_ref$2, _el$12) : (refTarget = _el$12);
  return _el$12;
})();
const template9 = (() => {
  var _el$13 = _tmpl$4();
  _$use(e => console.log(e), _el$13);
  return _el$13;
})();
const template10 = (() => {
  var _el$14 = _tmpl$4();
  var _ref$3 = refFactory();
  typeof _ref$3 === "function" && _$use(_ref$3, _el$14);
  return _el$14;
})();
const template11 = (() => {
  var _el$15 = _tmpl$4();
  _$use(zero, _el$15, () => 0);
  _$use(another, _el$15, () => thing);
  _$use(something, _el$15, () => true);
  return _el$15;
})();
const template12 = (() => {
  var _el$16 = _tmpl$4();
  _el$16.htmlFor = thing;
  _el$16.number = 123;
  _$setAttribute(_el$16, "onclick", "console.log('hi')");
  return _el$16;
})();
const template13 = (() => {
  var _el$17 = _tmpl$6();
  _el$17.checked = true;
  return _el$17;
})();
const template14 = (() => {
  var _el$18 = _tmpl$6();
  _$effect(() => (_el$18.checked = state.visible));
  return _el$18;
})();
const template15 = _tmpl$7();
const template16 = _tmpl$8();
const template17 = (() => {
  var _el$21 = _tmpl$9();
  _$addEventListener(_el$21, "click", increment, true);
  return _el$21;
})();
const template18 = (() => {
  var _el$22 = _tmpl$4();
  _$spread(
    _el$22,
    _$mergeProps(() => ({
      get [key()]() {
        return props.value;
      }
    })),
    false,
    false
  );
  return _el$22;
})();
const template19 = _tmpl$0();
const template20 = (() => {
  var _el$24 = _tmpl$1(),
    _el$25 = _el$24.firstChild,
    _el$26 = _el$25.nextSibling;
  _$addEventListener(_el$25, "input", doSomething, true);
  _$addEventListener(_el$26, "input", doSomethingElse, true);
  _el$26.readOnly = value;
  _$effect(
    _p$ => {
      var _v$4 = min(),
        _v$5 = max(),
        _v$6 = min(),
        _v$7 = max();
      _v$4 !== _p$.e && _$setAttribute(_el$25, "min", (_p$.e = _v$4));
      _v$5 !== _p$.t && _$setAttribute(_el$25, "max", (_p$.t = _v$5));
      _v$6 !== _p$.a && _$setAttribute(_el$26, "min", (_p$.a = _v$6));
      _v$7 !== _p$.o && _$setAttribute(_el$26, "max", (_p$.o = _v$7));
      return _p$;
    },
    {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    }
  );
  _$effect(() => (_el$25.value = s()));
  _$effect(() => (_el$26.checked = s2()));
  return _el$24;
})();
const template21 = (() => {
  var _el$27 = _tmpl$4();
  _$effect(_$p =>
    _$style(
      _el$27,
      {
        a: "static",
        ...rest
      },
      _$p
    )
  );
  return _el$27;
})();
const template22 = _tmpl$10();
const template23 = (() => {
  var _el$29 = _tmpl$4();
  _$insert(_el$29, () => "t" in test && "true");
  _$effect(() => (_el$29.disabled = "t" in test));
  return _el$29;
})();
const template24 = (() => {
  var _el$30 = _tmpl$11();
  _$spread(
    _el$30,
    _$mergeProps(props, {
      something: ""
    }),
    false,
    false
  );
  return _el$30;
})();
const template25 = (() => {
  var _el$31 = _tmpl$12(),
    _el$32 = _el$31.firstChild;
  _$insert(_el$31, () => props.children, _el$32);
  _$spread(
    _el$32,
    _$mergeProps(props, {
      something: ""
    }),
    false,
    false
  );
  return _el$31;
})();
const template26 = (() => {
  var _el$33 = _tmpl$13();
  _$setAttribute(_el$33, "middle", middle);
  _$spread(_el$33, spread, false, true);
  return _el$33;
})();
const template27 = (() => {
  var _el$34 = _tmpl$13();
  _$spread(
    _el$34,
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
  return _el$34;
})();
const template28 = (() => {
  var _el$35 = _tmpl$14(),
    _el$36 = _el$35.firstChild,
    _el$37 = _el$36.firstChild,
    _el$38 = _el$36.nextSibling,
    _el$39 = _el$38.nextSibling;
  _$spread(_el$35, _$mergeProps(api), false, true);
  _$spread(_el$36, _$mergeProps(api), false, true);
  _$insert(_el$36, () => (api() ? "checked" : "unchecked"), null);
  _$spread(_el$38, _$mergeProps(api), false, false);
  _$spread(_el$39, _$mergeProps(api), false, false);
  return _el$35;
})();
const template29 = (() => {
  var _el$40 = _tmpl$4();
  _$setAttribute(_el$40, "attribute", !!someValue);
  _$insert(_el$40, !!someValue);
  return _el$40;
})();
const template30 = _tmpl$15();
const template31 = (() => {
  var _el$42 = _tmpl$4();
  _$effect(_$p =>
    (_$p = getStore.itemProperties.color) != null
      ? _el$42.style.setProperty("background-color", _$p)
      : _el$42.style.removeProperty("background-color")
  );
  return _el$42;
})();
const template32 = (() => {
  var _el$43 = _tmpl$4();
  _el$43.style.removeProperty("background-color");
  return _el$43;
})();
const template33 = [
  (() => {
    var _el$44 = _tmpl$16();
    _$className(_el$44, styles.button);
    return _el$44;
  })(),
  (() => {
    var _el$45 = _tmpl$16();
    _$className(_el$45, styles["foo--bar"]);
    return _el$45;
  })(),
  (() => {
    var _el$46 = _tmpl$16();
    _$effect(() => _$className(_el$46, styles.foo.bar));
    return _el$46;
  })(),
  (() => {
    var _el$47 = _tmpl$16();
    _$effect(() => _$className(_el$47, styles[foo()]));
    return _el$47;
  })()
];
const template34 = (() => {
  var _el$48 = _tmpl$4();
  _$use(zero, _el$48, () => 0);
  _$use(something, _el$48, () => true);
  _$spread(_el$48, somethingElse, false, false);
  return _el$48;
})();
const template35 = (() => {
  var _el$49 = _tmpl$4();
  var _ref$4 = a().b.c;
  typeof _ref$4 === "function" ? _$use(_ref$4, _el$49) : (a().b.c = _el$49);
  return _el$49;
})();
const template36 = (() => {
  var _el$50 = _tmpl$4();
  var _ref$5 = a().b?.c;
  typeof _ref$5 === "function" && _$use(_ref$5, _el$50);
  return _el$50;
})();
const template37 = (() => {
  var _el$51 = _tmpl$4();
  var _ref$6 = a() ? b : c;
  typeof _ref$6 === "function" && _$use(_ref$6, _el$51);
  return _el$51;
})();
const template38 = (() => {
  var _el$52 = _tmpl$4();
  var _ref$7 = a() ?? b;
  typeof _ref$7 === "function" && _$use(_ref$7, _el$52);
  return _el$52;
})();
const template39 = _tmpl$17();
const template40 = (() => {
  var _el$54 = _tmpl$4();
  _$effect(_$p =>
    (_$p = a()) != null
      ? _el$54.style.setProperty("color", _$p)
      : _el$54.style.removeProperty("color")
  );
  return _el$54;
})();
const template41 = (() => {
  var _el$55 = _tmpl$18(),
    _el$56 = _el$55.firstChild,
    _el$57 = _el$56.nextSibling;
  _$effect(() => (_el$56.value = Color.Red));
  _$effect(() => (_el$57.value = Color.Blue));
  _$effect(() => (_el$55.value = state.color));
  return _el$55;
})();

// bool:
function boolTest() {
  return true;
}
const boolTestBinding = false;
const boolTestObjBinding = {
  value: false
};
const template42 = _tmpl$19();
const template43 = _tmpl$20();
const template44 = _tmpl$21();
const template45 = _tmpl$22();
const template46 = _tmpl$23();
const template47 = _tmpl$24();
const template48 = _tmpl$25();
const template49 = _tmpl$26();
const template50 = _tmpl$27();
const template51 = _tmpl$28();
const template52 = _tmpl$29();
const template53 = _tmpl$30();
const template54 = (() => {
  var _el$70 = _tmpl$31();
  _$effect(() => _$setBoolAttribute(_el$70, "quack", boolTest()));
  return _el$70;
})();
const template55 = (() => {
  var _el$71 = _tmpl$32();
  _$setBoolAttribute(_el$71, "quack", boolTest);
  return _el$71;
})();
const template56 = (() => {
  var _el$72 = _tmpl$33();
  _$setBoolAttribute(_el$72, "quack", boolTestBinding);
  return _el$72;
})();
const template57 = (() => {
  var _el$73 = _tmpl$34();
  _$effect(() => _$setBoolAttribute(_el$73, "quack", boolTestObjBinding.value));
  return _el$73;
})();
const template58 = (() => {
  var _el$74 = _tmpl$35();
  _$setBoolAttribute(_el$74, "quack", () => false);
  return _el$74;
})();
const template59 = _tmpl$36();
const template60 = _tmpl$37();
const template61 = _tmpl$38();
// this crash it for some reason- */ const template62 = <div bool:quack>really empty</div>;

const template63 = _tmpl$39();
const template64 = _tmpl$40();
const template65 = _tmpl$41();
const template66 = _tmpl$42();
const template67 = _tmpl$43();
const template68 = _tmpl$44();
const template69 = _tmpl$45();
const template70 = _tmpl$46();
const template71 = _tmpl$47();
const template72 = (() => {
  var _el$87 = _tmpl$4();
  _$use(binding, _el$87);
  return _el$87;
})();
const template73 = (() => {
  var _el$88 = _tmpl$4();
  var _ref$8 = binding.prop;
  typeof _ref$8 === "function" ? _$use(_ref$8, _el$88) : (binding.prop = _el$88);
  return _el$88;
})();
const template74 = (() => {
  var _el$89 = _tmpl$4();
  var _ref$9 = refFn;
  typeof _ref$9 === "function" ? _$use(_ref$9, _el$89) : (refFn = _el$89);
  return _el$89;
})();
const template75 = (() => {
  var _el$90 = _tmpl$4();
  _$use(refConst, _el$90);
  return _el$90;
})();
const template76 = (() => {
  var _el$91 = _tmpl$4();
  var _ref$0 = refUnknown;
  typeof _ref$0 === "function" ? _$use(_ref$0, _el$91) : (refUnknown = _el$91);
  return _el$91;
})();
const template77 = (() => {
  var _el$92 = _tmpl$48();
  _$setAttribute(_el$92, "true", true);
  return _el$92;
})();
const template78 = (() => {
  var _el$93 = _tmpl$49();
  _$setAttribute(_el$93, "false", false);
  return _el$93;
})();
const template79 = (() => {
  var _el$94 = _tmpl$4();
  _el$94.true = true;
  _el$94.false = false;
  return _el$94;
})();
const template80 = (() => {
  var _el$95 = _tmpl$4();
  _$setAttribute(_el$95, "true", true);
  _$setAttribute(_el$95, "false", false);
  return _el$95;
})();
const template81 = _tmpl$50();
const template82 = _tmpl$51();
const template83 = _tmpl$52();
const template84 = _tmpl$53();
const template85 = (() => {
  var _el$100 = _tmpl$54();
  _el$100.poster = "1.jpg";
  return _el$100;
})();
const template86 = (() => {
  var _el$101 = _tmpl$55(),
    _el$102 = _el$101.firstChild;
  _el$102.poster = "1.jpg";
  return _el$101;
})();
const template87 = _tmpl$56();
const template88 = _tmpl$57();
_$delegateEvents(["click", "input"]);
