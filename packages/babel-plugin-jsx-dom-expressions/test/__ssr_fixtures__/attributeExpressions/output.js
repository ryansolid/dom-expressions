import { ssrClassName as _$ssrClassName } from "r-server";
import { ssrStyle as _$ssrStyle } from "r-server";
import { ssrAttribute as _$ssrAttribute } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { escape as _$escape } from "r-server";
import { ssrElement as _$ssrElement } from "r-server";
import { mergeProps as _$mergeProps } from "r-server";
import { ssr as _$ssr } from "r-server";
var _tmpl$ = ['<a href="/" class="', '">Welcome</a>'],
  _tmpl$2 = ["<div>", "</div>"],
  _tmpl$3 = "<div><div/></div>",
  _tmpl$4 = ["<div", " foo", ' style="', '">', "</div>"],
  _tmpl$5 = ["<div", ' class="', '"></div>'],
  _tmpl$6 = ["<div", ' class="a" className="b"></div>'],
  _tmpl$7 = ["<div", ' style="', '">Hi</div>'],
  _tmpl$8 = ["<div", ' style="', '"', "></div>"],
  _tmpl$9 = ["<div", "></div>"],
  _tmpl$10 = ["<div", ' onclick="', '"></div>'],
  _tmpl$11 = ["<input", ' type="checkbox" checked>'],
  _tmpl$12 = ["<input", ' type="checkbox">'],
  _tmpl$13 = ["<div", ' class="`a">`$`</div>'],
  _tmpl$14 = ["<button", ' class="', '" type="button">Write</button>'],
  _tmpl$15 = ["<button", ' class="', '">Hi</button>'],
  _tmpl$16 = ["<div", "><input readonly><input", "></div>"],
  _tmpl$17 = ["<div", ' style="', '"></div>'],
  _tmpl$18 = ["<div", ' data="&quot;hi&quot;" data2="&quot;"></div>'],
  _tmpl$19 = ["<div", ">", "</div>"],
  _tmpl$20 = ["<div", "><!--$-->", "<!--/-->", "</div>"],
  _tmpl$21 = ["<div", "", ">", "</div>"],
  _tmpl$22 = [
    "<div",
    ' class="class1 class2 class3 class4 class5 class6" style="color:red;background-color:blue !important;border:1px solid black;font-size:12px;" random="random1 random2\n    random3 random4"></div>'
  ],
  _tmpl$23 = ["<button", ' class="', '"></button>'],
  _tmpl$24 = ["<input", ' value="10">'],
  _tmpl$25 = ["<select", "><option>Red</option><option>Blue</option></select>"],
  _tmpl$26 = ["<div", ">empty string</div>"],
  _tmpl$27 = ["<div", ">js empty</div>"],
  _tmpl$28 = ["<div", ">hola</div>"],
  _tmpl$29 = ["<div", '>"hola js"</div>'],
  _tmpl$30 = ["<div", " quack>true</div>"],
  _tmpl$31 = ["<div", ">false</div>"],
  _tmpl$32 = ["<div", ">1</div>"],
  _tmpl$33 = ["<div", ">0</div>"],
  _tmpl$34 = ["<div", '>"1"</div>'],
  _tmpl$35 = ["<div", '>"0"</div>'],
  _tmpl$36 = ["<div", "", ">undefined</div>"],
  _tmpl$37 = ["<div", ">null</div>"],
  _tmpl$38 = ["<div", ">boolTest()</div>"],
  _tmpl$39 = ["<div", "", ">boolTest</div>"],
  _tmpl$40 = ["<div", "", ">boolTestBinding</div>"],
  _tmpl$41 = ["<div", ">boolTestObjBinding.value</div>"],
  _tmpl$42 = ["<div", "", ">fn</div>"],
  _tmpl$43 = ["<div", " before>should have space before</div>"],
  _tmpl$44 = ["<div", " before after>should have space before/after</div>"],
  _tmpl$45 = ["<div", " after>should have space before/after</div>"],
  _tmpl$46 = ["<img", " src>"],
  _tmpl$47 = ["<div", "><img src></div>"],
  _tmpl$48 = ["<img", ' src loading="lazy">'],
  _tmpl$49 = ["<div", '><img src loading="lazy"></div>'],
  _tmpl$50 = ["<iframe", " src></iframe>"],
  _tmpl$51 = ["<div", "><iframe src></iframe></div>"],
  _tmpl$52 = ["<iframe", ' src loading="lazy"></iframe>'],
  _tmpl$53 = ["<div", '><iframe src loading="lazy"></iframe></div>'],
  _tmpl$54 = ["<div", ' title="<u>data</u>"></div>'],
  _tmpl$55 = ["<div", ' true="true" truestr="true" truestrjs="true"></div>'],
  _tmpl$56 = ["<div", ' false="false" falsestr="false" falsestrjs="false"></div>'],
  _tmpl$57 = ["<div", "", "", "></div>"],
  _tmpl$58 = ["<div", ' a b c d="true" e="false" f="0" g h', "", "", " l></div>"];
import * as styles from "./styles.module.css";
import { binding } from "somewhere";
function refFn() {}
const refConst = null;
const selected = true;
let id = "my-h1";
let link;
const template = _$ssrElement(
  "div",
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
  () =>
    _$ssrElement(
      "h1",
      _$mergeProps(
        {
          id: id
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
      () => _$ssr(_tmpl$, "ccc ddd"),
      false
    ),
  true
);
const template2 = _$ssrElement(
  "div",
  getProps("test"),
  () => [
    (() => {
      var _v$ = _$ssrRunInScope(_$escape(rowId) || " ");
      return _$ssr(_tmpl$2, _v$);
    })(),
    (() => {
      var _v$2 = _$ssrRunInScope(() => _$escape(row.label) || " ");
      return _$ssr(_tmpl$2, _v$2);
    })(),
    _$ssr(_tmpl$3)
  ],
  true
);
const template3 = (() => {
  var _v$3 = _$ssrHydrationKey(),
    _v$5 = _$ssrRunInScope(_$escape(state.content) || " "),
    _v$4 = _$ssrRunInScope([() => _$ssrAttribute("name", _$escape(state.name, true), false)]);
  return _$ssr(
    _tmpl$4,
    _v$3,
    _$ssrAttribute("id", _$escape(state.id, true), false),
    "background-color:" + _$escape(state.color, true),
    _v$4[0],
    _v$5
  );
})();
const template4 = (() => {
  var _v$6 = _$ssrHydrationKey(),
    _v$7 = _$ssrRunInScope([() => _$ssrAttribute("className", _$escape(state.class, true), false)]);
  return _$ssr(_tmpl$5, _v$6, _v$7[0], "ccc:ddd");
})();
const template5 = (() => {
  var _v$8 = _$ssrHydrationKey();
  return _$ssr(_tmpl$6, _v$8);
})();
const template6 = (() => {
  var _v$9 = _$ssrHydrationKey(),
    _v$10 = _$ssrRunInScope([() => _$ssrStyle(someStyle())]);
  return _$ssr(_tmpl$7, _v$9, _v$10[0]);
})();
let undefVar;
const template7 = (() => {
  var _v$11 = _$ssrHydrationKey(),
    _v$12 = _$ssrRunInScope([
      () =>
        _$ssrStyle({
          "background-color": color(),
          "margin-right": "40px",
          ...props.style,
          "padding-top": props.top
        })
    ]);
  return _$ssr(
    _tmpl$8,
    _v$11,
    _v$12[0],
    _$ssrAttribute("other-class", _$escape(undefVar, true), false)
  );
})();
let refTarget;
const template8 = (() => {
  var _v$13 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$13);
})();
const template9 = (() => {
  var _v$14 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$14);
})();
const template10 = (() => {
  var _v$15 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$15);
})();
const template11 = (() => {
  var _v$16 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$16);
})();
const template12 = (() => {
  var _v$17 = _$ssrHydrationKey();
  return _$ssr(_tmpl$10, _v$17, "console.log('hi')");
})();
const template13 = (() => {
  var _v$18 = _$ssrHydrationKey();
  return _$ssr(_tmpl$11, _v$18);
})();
const template14 = (() => {
  var _v$19 = _$ssrHydrationKey(),
    _v$20 = _$ssrRunInScope(() => _$ssrAttribute("checked", state.visible, true));
  return _$ssr(_tmpl$12, _v$19, _v$20);
})();
const template15 = (() => {
  var _v$21 = _$ssrHydrationKey();
  return _$ssr(_tmpl$13, _v$21);
})();
const template16 = (() => {
  var _v$22 = _$ssrHydrationKey();
  return _$ssr(
    _tmpl$14,
    _v$22,
    _$ssrClassName([
      "static",
      {
        hi: "k"
      }
    ])
  );
})();
const template17 = (() => {
  var _v$23 = _$ssrHydrationKey();
  return _$ssr(_tmpl$15, _v$23, "a  b  c");
})();
const template18 = _$ssrElement(
  "div",
  {
    get [key()]() {
      return props.value;
    }
  },
  undefined,
  true
);
const template19 = (() => {
  var _v$24 = _$ssrHydrationKey();
  return _$ssr(
    _tmpl$5,
    _v$24,
    _$ssrClassName([
      {
        "bg-red-500": true
      },
      "flex flex-col"
    ])
  );
})();
const template20 = (() => {
  var _v$25 = _$ssrHydrationKey(),
    _v$27 = _$ssrRunInScope([
      () => _$ssrAttribute("min", _$escape(min(), true), false),
      () => _$ssrAttribute("max", _$escape(max(), true), false),
      () => _$ssrAttribute("min", _$escape(min(), true), false),
      () => _$ssrAttribute("max", _$escape(max(), true), false)
    ]),
    _v$26 = _$ssrRunInScope(() => _$ssrAttribute("value", _$escape(s(), true), false)),
    _v$28 = _$ssrRunInScope(() => _$ssrAttribute("checked", s2(), true));
  return _$ssr(
    _tmpl$16,
    _v$25,
    _v$26,
    _v$27[0],
    _v$27[1],
    _v$28,
    _v$27[2],
    _v$27[3],
    _$ssrAttribute("readonly", value, true)
  );
})();
const template21 = (() => {
  var _v$29 = _$ssrHydrationKey(),
    _v$30 = _$ssrRunInScope([
      () =>
        _$ssrStyle({
          a: "static",
          ...rest
        })
    ]);
  return _$ssr(_tmpl$17, _v$29, _v$30[0]);
})();
const template22 = (() => {
  var _v$31 = _$ssrHydrationKey();
  return _$ssr(_tmpl$18, _v$31);
})();
const template23 = (() => {
  var _v$32 = _$ssrHydrationKey(),
    _v$34 = _$ssrRunInScope(() => "t" in test && "true"),
    _v$33 = _$ssrRunInScope([() => _$ssrAttribute("disabled", "t" in test, true)]);
  return _$ssr(_tmpl$19, _v$32, _v$33[0], _v$34);
})();
const template24 = _$ssrElement(
  "a",
  _$mergeProps(props, {
    something: true
  }),
  undefined,
  true
);
const template25 = (() => {
  var _v$35 = _$ssrHydrationKey(),
    _v$36 = _$ssrRunInScope(() => _$escape(props.children)),
    _v$37 = _$ssrRunInScope(
      _$ssrElement(
        "a",
        _$mergeProps(props, {
          something: true
        }),
        undefined,
        false
      )
    );
  return _$ssr(_tmpl$20, _v$35, _v$36, _v$37);
})();
const template26 = _$ssrElement(
  "div",
  _$mergeProps(
    {
      start: "Hi",
      middle: middle
    },
    spread
  ),
  () => "Hi",
  true
);
const template27 = _$ssrElement(
  "div",
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
  () => "Hi",
  true
);
const template28 = _$ssrElement(
  "label",
  api(),
  () => [
    _$ssrElement(
      "span",
      api(),
      () => ["Input is ", "<!--$-->", () => (api() ? "checked" : "unchecked"), "<!--/-->"],
      false
    ),
    _$ssrElement("input", api(), undefined, false),
    _$ssrElement("div", api(), undefined, false)
  ],
  true
);
const template29 = (() => {
  var _v$38 = _$ssrHydrationKey(),
    _v$39 = _$ssrRunInScope(!!someValue);
  return _$ssr(_tmpl$21, _v$38, _$ssrAttribute("attribute", !!someValue, false), _v$39);
})();
const template30 = (() => {
  var _v$40 = _$ssrHydrationKey();
  return _$ssr(_tmpl$22, _v$40);
})();
const template31 = (() => {
  var _v$41 = _$ssrHydrationKey(),
    _v$42 = _$ssrRunInScope([
      () => "background-color:" + _$escape(getStore.itemProperties.color, true)
    ]);
  return _$ssr(_tmpl$17, _v$41, _v$42[0]);
})();
const template32 = (() => {
  var _v$43 = _$ssrHydrationKey();
  return _$ssr(_tmpl$17, _v$43, "background-color:" + _$escape(undefined, true));
})();
const template33 = [
  (() => {
    var _v$44 = _$ssrHydrationKey();
    return _$ssr(_tmpl$23, _v$44, _$ssrClassName(styles.button));
  })(),
  (() => {
    var _v$45 = _$ssrHydrationKey();
    return _$ssr(_tmpl$23, _v$45, _$ssrClassName(styles["foo--bar"]));
  })(),
  (() => {
    var _v$46 = _$ssrHydrationKey(),
      _v$47 = _$ssrRunInScope([() => _$ssrClassName(styles.foo.bar)]);
    return _$ssr(_tmpl$23, _v$46, _v$47[0]);
  })(),
  (() => {
    var _v$48 = _$ssrHydrationKey(),
      _v$49 = _$ssrRunInScope([() => _$ssrClassName(styles[foo()])]);
    return _$ssr(_tmpl$23, _v$48, _v$49[0]);
  })()
];
const template34 = _$ssrElement("div", somethingElse, undefined, true);
const template35 = (() => {
  var _v$50 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$50);
})();
const template36 = (() => {
  var _v$51 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$51);
})();
const template37 = (() => {
  var _v$52 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$52);
})();
const template38 = (() => {
  var _v$53 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$53);
})();
const template39 = (() => {
  var _v$54 = _$ssrHydrationKey();
  return _$ssr(_tmpl$24, _v$54);
})();
const template40 = (() => {
  var _v$55 = _$ssrHydrationKey(),
    _v$56 = _$ssrRunInScope([() => "color:" + _$escape(a(), true)]);
  return _$ssr(_tmpl$17, _v$55, _v$56[0]);
})();
const template41 = (() => {
  var _v$57 = _$ssrHydrationKey(),
    _v$58 = _$ssrRunInScope(() => _$ssrAttribute("value", _$escape(state.color, true), false)),
    _v$59 = _$ssrRunInScope(() => _$ssrAttribute("value", _$escape(Color.Red, true), false)),
    _v$60 = _$ssrRunInScope(() => _$ssrAttribute("value", _$escape(Color.Blue, true), false));
  return _$ssr(_tmpl$25, _v$57, _v$58, _v$59, _v$60);
})();

// bool:
function boolTest() {
  return true;
}
const boolTestBinding = false;
const boolTestObjBinding = {
  value: false
};
const template42 = (() => {
  var _v$61 = _$ssrHydrationKey();
  return _$ssr(_tmpl$26, _v$61);
})();
const template43 = (() => {
  var _v$62 = _$ssrHydrationKey();
  return _$ssr(_tmpl$27, _v$62);
})();
const template44 = (() => {
  var _v$63 = _$ssrHydrationKey();
  return _$ssr(_tmpl$28, _v$63);
})();
const template45 = (() => {
  var _v$64 = _$ssrHydrationKey();
  return _$ssr(_tmpl$29, _v$64);
})();
const template46 = (() => {
  var _v$65 = _$ssrHydrationKey();
  return _$ssr(_tmpl$30, _v$65);
})();
const template47 = (() => {
  var _v$66 = _$ssrHydrationKey();
  return _$ssr(_tmpl$31, _v$66);
})();
const template48 = (() => {
  var _v$67 = _$ssrHydrationKey();
  return _$ssr(_tmpl$32, _v$67);
})();
const template49 = (() => {
  var _v$68 = _$ssrHydrationKey();
  return _$ssr(_tmpl$33, _v$68);
})();
const template50 = (() => {
  var _v$69 = _$ssrHydrationKey();
  return _$ssr(_tmpl$34, _v$69);
})();
const template51 = (() => {
  var _v$70 = _$ssrHydrationKey();
  return _$ssr(_tmpl$35, _v$70);
})();
const template52 = (() => {
  var _v$71 = _$ssrHydrationKey();
  return _$ssr(_tmpl$36, _v$71, _$ssrAttribute("quack", undefined, true));
})();
const template53 = (() => {
  var _v$72 = _$ssrHydrationKey();
  return _$ssr(_tmpl$37, _v$72);
})();
const template54 = (() => {
  var _v$73 = _$ssrHydrationKey(),
    _v$74 = _$ssrRunInScope([() => _$ssrAttribute("quack", boolTest(), true)]);
  return _$ssr(_tmpl$38, _v$73, _v$74[0]);
})();
const template55 = (() => {
  var _v$75 = _$ssrHydrationKey();
  return _$ssr(_tmpl$39, _v$75, _$ssrAttribute("quack", boolTest, true));
})();
const template56 = (() => {
  var _v$76 = _$ssrHydrationKey();
  return _$ssr(_tmpl$40, _v$76, _$ssrAttribute("quack", boolTestBinding, true));
})();
const template57 = (() => {
  var _v$77 = _$ssrHydrationKey(),
    _v$78 = _$ssrRunInScope([() => _$ssrAttribute("quack", boolTestObjBinding.value, true)]);
  return _$ssr(_tmpl$41, _v$77, _v$78[0]);
})();
const template58 = (() => {
  var _v$79 = _$ssrHydrationKey();
  return _$ssr(
    _tmpl$42,
    _v$79,
    _$ssrAttribute("quack", () => false, true)
  );
})();
const template59 = (() => {
  var _v$80 = _$ssrHydrationKey();
  return _$ssr(_tmpl$43, _v$80);
})();
const template60 = (() => {
  var _v$81 = _$ssrHydrationKey();
  return _$ssr(_tmpl$44, _v$81);
})();
const template61 = (() => {
  var _v$82 = _$ssrHydrationKey();
  return _$ssr(_tmpl$45, _v$82);
})();
// this crash it for some reason- */ const template62 = <div bool:quack>really empty</div>;

const template63 = (() => {
  var _v$83 = _$ssrHydrationKey();
  return _$ssr(_tmpl$46, _v$83);
})();
const template64 = (() => {
  var _v$84 = _$ssrHydrationKey();
  return _$ssr(_tmpl$47, _v$84);
})();
const template65 = (() => {
  var _v$85 = _$ssrHydrationKey();
  return _$ssr(_tmpl$48, _v$85);
})();
const template66 = (() => {
  var _v$86 = _$ssrHydrationKey();
  return _$ssr(_tmpl$49, _v$86);
})();
const template67 = (() => {
  var _v$87 = _$ssrHydrationKey();
  return _$ssr(_tmpl$50, _v$87);
})();
const template68 = (() => {
  var _v$88 = _$ssrHydrationKey();
  return _$ssr(_tmpl$51, _v$88);
})();
const template69 = (() => {
  var _v$89 = _$ssrHydrationKey();
  return _$ssr(_tmpl$52, _v$89);
})();
const template70 = (() => {
  var _v$90 = _$ssrHydrationKey();
  return _$ssr(_tmpl$53, _v$90);
})();
const template71 = (() => {
  var _v$91 = _$ssrHydrationKey();
  return _$ssr(_tmpl$54, _v$91);
})();
const template72 = (() => {
  var _v$92 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$92);
})();
const template73 = (() => {
  var _v$93 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$93);
})();
const template74 = (() => {
  var _v$94 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$94);
})();
const template75 = (() => {
  var _v$95 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$95);
})();
const template76 = (() => {
  var _v$96 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$96);
})();
const template77 = (() => {
  var _v$97 = _$ssrHydrationKey();
  return _$ssr(_tmpl$55, _v$97);
})();
const template78 = (() => {
  var _v$98 = _$ssrHydrationKey();
  return _$ssr(_tmpl$56, _v$98);
})();
const template79 = (() => {
  var _v$99 = _$ssrHydrationKey();
  return _$ssr(_tmpl$9, _v$99);
})();
const template80 = (() => {
  var _v$100 = _$ssrHydrationKey();
  return _$ssr(
    _tmpl$57,
    _v$100,
    _$ssrAttribute("true", _$escape(true, true), false),
    _$ssrAttribute("false", _$escape(false, true), false)
  );
})();
const template81 = (() => {
  var _v$101 = _$ssrHydrationKey();
  return _$ssr(
    _tmpl$58,
    _v$101,
    _$ssrAttribute("i", _$escape(undefined, true), false),
    _$ssrAttribute("j", _$escape(null, true), false),
    _$ssrAttribute("k", void 0, false)
  );
})();
