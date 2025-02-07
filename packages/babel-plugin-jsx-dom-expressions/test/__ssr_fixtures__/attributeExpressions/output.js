import { ssrClassName as _$ssrClassName } from "r-server";
import { ssrStyle as _$ssrStyle } from "r-server";
import { ssrAttribute as _$ssrAttribute } from "r-server";
import { escape as _$escape } from "r-server";
import { ssrElement as _$ssrElement } from "r-server";
import { mergeProps as _$mergeProps } from "r-server";
import { ssr as _$ssr } from "r-server";
var _tmpl$ = ['<a href="/" class="', '">Welcome</a>'],
  _tmpl$2 = ["<div>", "</div>"],
  _tmpl$3 = "<div><div/></div>",
  _tmpl$4 = ["<div foo", ' style="', '"', ">", "</div>"],
  _tmpl$5 = ["<div", ' class="', '"></div>'],
  _tmpl$6 = '<div class="a" className="b"></div>',
  _tmpl$7 = ['<div style="', '">Hi</div>'],
  _tmpl$8 = ['<div style="', '"', "></div>"],
  _tmpl$9 = "<div></div>",
  _tmpl$10 = ['<div onclick="', '"></div>'],
  _tmpl$11 = '<input type="checkbox" checked>',
  _tmpl$12 = ['<input type="checkbox"', ">"],
  _tmpl$13 = '<div class="`a">`$`</div>',
  _tmpl$14 = ['<button class="', '" type="button">Write</button>'],
  _tmpl$15 = ['<button class="', '">Hi</button>'],
  _tmpl$16 = ['<div class="', '"></div>'],
  _tmpl$17 = ["<div><input", " readonly><input", "", "></div>"],
  _tmpl$18 = ['<div style="', '"></div>'],
  _tmpl$19 = '<div data="&quot;hi&quot;" data2="&quot;"></div>',
  _tmpl$20 = ["<div", ">", "</div>"],
  _tmpl$21 = ["<div>", "", "</div>"],
  _tmpl$22 =
    '<div class="class1 class2 class3 class4 class5 class6" style="color:red;background-color:blue !important;border:1px solid black;font-size:12px;" random="random1 random2\n    random3 random4"></div>',
  _tmpl$23 = ['<button class="', '"></button>'],
  _tmpl$24 = '<input value="10">',
  _tmpl$25 = ["<select", "><option", ">Red</option><option", ">Blue</option></select>"],
  _tmpl$26 = ['<div bool:quack="', '">empty string</div>'],
  _tmpl$27 = ['<div bool:quack="', '">js empty</div>'],
  _tmpl$28 = ['<div bool:quack="', '">hola</div>'],
  _tmpl$29 = ['<div bool:quack="', '">"hola js"</div>'],
  _tmpl$30 = ["<div", ">true</div>"],
  _tmpl$31 = ["<div", ">false</div>"],
  _tmpl$32 = ['<div bool:quack="', '">1</div>'],
  _tmpl$33 = ['<div bool:quack="', '">0</div>'],
  _tmpl$34 = ['<div bool:quack="', '">"1"</div>'],
  _tmpl$35 = ['<div bool:quack="', '">"0"</div>'],
  _tmpl$36 = ["<div", ">undefined</div>"],
  _tmpl$37 = ["<div", ">null</div>"],
  _tmpl$38 = ["<div", ">boolTest()</div>"],
  _tmpl$39 = ["<div", ">boolTest</div>"],
  _tmpl$40 = ["<div", ">boolTestBinding</div>"],
  _tmpl$41 = ["<div", ">boolTestObjBinding.value</div>"],
  _tmpl$42 = ["<div", ">fn</div>"],
  _tmpl$43 = ['<div before bool:quack="', '">should have space before</div>'],
  _tmpl$44 = ['<div before bool:quack="', '" after>should have space before/after</div>'],
  _tmpl$45 = ['<div bool:quack="', '" after>should have space before/after</div>'],
  _tmpl$46 = "<img src>",
  _tmpl$47 = "<div><img src></div>",
  _tmpl$48 = '<img src loading="lazy">',
  _tmpl$49 = '<div><img src loading="lazy"></div>',
  _tmpl$50 = "<iframe src></iframe>",
  _tmpl$51 = "<div><iframe src></iframe></div>",
  _tmpl$52 = '<iframe src loading="lazy"></iframe>',
  _tmpl$53 = '<div><iframe src loading="lazy"></iframe></div>',
  _tmpl$54 = '<div title="<u>data</u>"></div>',
  _tmpl$55 = '<div true="true" truestr="true" truestrjs="true"></div>',
  _tmpl$56 = '<div false="false" falsestr="false" falsestrjs="false"></div>',
  _tmpl$57 = ["<div", "></div>"],
  _tmpl$58 = ['<div a b c d="true" e="false" f="0" g h', " l></div>"],
  _tmpl$59 = ["<style>", "</style>"];
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
    _$ssr(_tmpl$, "ccc ddd"),
    false
  ),
  false
);
const template2 = _$ssrElement(
  "div",
  getProps("test"),
  [_$ssr(_tmpl$2, _$escape(rowId)), _$ssr(_tmpl$2, _$escape(row.label)), _$ssr(_tmpl$3)],
  false
);
const template3 = _$ssr(
  _tmpl$4,
  _$ssrAttribute("id", _$escape(/*@once*/ state.id, true), false),
  "background-color:" + _$escape(state.color, true),
  _$ssrAttribute("name", _$escape(state.name, true), false),
  _$escape(state.content)
);
const template4 = _$ssr(
  _tmpl$5,
  _$ssrAttribute("className", _$escape(state.class, true), false),
  "ccc:ddd"
);
const template5 = _$ssr(_tmpl$6);
const template6 = _$ssr(_tmpl$7, _$ssrStyle(someStyle()));
let undefVar;
const template7 = _$ssr(
  _tmpl$8,
  _$ssrStyle({
    "background-color": color(),
    "margin-right": "40px",
    ...props.style,
    "padding-top": props.top
  }),
  _$ssrAttribute("other-class", _$escape(undefVar, true), false)
);
let refTarget;
const template8 = _$ssr(_tmpl$9);
const template9 = _$ssr(_tmpl$9);
const template10 = _$ssr(_tmpl$9);
const template11 = _$ssr(_tmpl$9);
const template12 = _$ssr(_tmpl$10, "console.log('hi')");
const template13 = _$ssr(_tmpl$11);
const template14 = _$ssr(_tmpl$12, _$ssrAttribute("checked", state.visible, true));
const template15 = _$ssr(_tmpl$13);
const template16 = _$ssr(
  _tmpl$14,
  _$ssrClassName([
    "static",
    {
      hi: "k"
    }
  ])
);
const template17 = _$ssr(_tmpl$15, "a  b  c");
const template18 = _$ssrElement(
  "div",
  {
    get [key()]() {
      return props.value;
    }
  },
  undefined,
  false
);
const template19 = _$ssr(
  _tmpl$16,
  _$ssrClassName([
    {
      "bg-red-500": true
    },
    "flex flex-col"
  ])
);
const template20 = _$ssr(
  _tmpl$17,
  _$ssrAttribute("value", _$escape(s(), true), false) +
    _$ssrAttribute("min", _$escape(min(), true), false) +
    _$ssrAttribute("max", _$escape(max(), true), false),
  _$ssrAttribute("checked", s2(), true) +
    _$ssrAttribute("min", _$escape(min(), true), false) +
    _$ssrAttribute("max", _$escape(max(), true), false),
  _$ssrAttribute("readonly", value, true)
);
const template21 = _$ssr(
  _tmpl$18,
  _$ssrStyle({
    a: "static",
    ...rest
  })
);
const template22 = _$ssr(_tmpl$19);
const template23 = _$ssr(
  _tmpl$20,
  _$ssrAttribute("disabled", "t" in test, true),
  "t" in test && "true"
);
const template24 = _$ssrElement(
  "a",
  _$mergeProps(props, {
    something: true
  }),
  undefined,
  false
);
const template25 = _$ssr(
  _tmpl$21,
  _$escape(props.children),
  _$ssrElement(
    "a",
    _$mergeProps(props, {
      something: true
    }),
    undefined,
    false
  )
);
const template26 = _$ssrElement(
  "div",
  _$mergeProps(
    {
      start: "Hi",
      middle: middle
    },
    spread
  ),
  "Hi",
  false
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
  "Hi",
  false
);
const template28 = _$ssrElement(
  "label",
  api(),
  [
    _$ssrElement("span", api(), ["Input is ", api() ? "checked" : "unchecked"], false),
    _$ssrElement("input", api(), undefined, false),
    _$ssrElement("div", api(), undefined, false)
  ],
  false
);
const template29 = _$ssr(_tmpl$20, _$ssrAttribute("attribute", !!someValue, false), !!someValue);
const template30 = _$ssr(_tmpl$22);
const template31 = _$ssr(
  _tmpl$18,
  "background-color:" + _$escape(getStore.itemProperties.color, true)
);
const template32 = _$ssr(_tmpl$18, "background-color:" + _$escape(undefined, true));
const template33 = [
  _$ssr(_tmpl$23, _$ssrClassName(styles.button)),
  _$ssr(_tmpl$23, _$ssrClassName(styles["foo--bar"])),
  _$ssr(_tmpl$23, _$ssrClassName(styles.foo.bar)),
  _$ssr(_tmpl$23, _$ssrClassName(styles[foo()]))
];
const template34 = _$ssrElement("div", somethingElse, undefined, false);
const template35 = _$ssr(_tmpl$9);
const template36 = _$ssr(_tmpl$9);
const template37 = _$ssr(_tmpl$9);
const template38 = _$ssr(_tmpl$9);
const template39 = _$ssr(_tmpl$24);
const template40 = _$ssr(_tmpl$18, "color:" + _$escape(a(), true));
const template41 = _$ssr(
  _tmpl$25,
  _$ssrAttribute("value", _$escape(state.color, true), false),
  _$ssrAttribute("value", _$escape(Color.Red, true), false),
  _$ssrAttribute("value", _$escape(Color.Blue, true), false)
);

// bool:
function boolTest() {
  return true;
}
const boolTestBinding = false;
const boolTestObjBinding = {
  value: false
};
const template42 = _$ssr(_tmpl$26, "");
const template43 = _$ssr(_tmpl$27, "");
const template44 = _$ssr(_tmpl$28, "hola");
const template45 = _$ssr(_tmpl$29, "hola js");
const template46 = _$ssr(_tmpl$30, _$ssrAttribute("quack", _$escape(true, true), false));
const template47 = _$ssr(_tmpl$31, _$ssrAttribute("quack", _$escape(false, true), false));
const template48 = _$ssr(_tmpl$32, 1);
const template49 = _$ssr(_tmpl$33, 0);
const template50 = _$ssr(_tmpl$34, "1");
const template51 = _$ssr(_tmpl$35, "0");
const template52 = _$ssr(_tmpl$36, _$ssrAttribute("quack", _$escape(undefined, true), false));
const template53 = _$ssr(_tmpl$37, _$ssrAttribute("quack", _$escape(null, true), false));
const template54 = _$ssr(_tmpl$38, _$ssrAttribute("quack", _$escape(boolTest(), true), false));
const template55 = _$ssr(_tmpl$39, _$ssrAttribute("quack", _$escape(boolTest, true), false));
const template56 = _$ssr(_tmpl$40, _$ssrAttribute("quack", _$escape(boolTestBinding, true), false));
const template57 = _$ssr(
  _tmpl$41,
  _$ssrAttribute("quack", _$escape(boolTestObjBinding.value, true), false)
);
const template58 = _$ssr(
  _tmpl$42,
  _$ssrAttribute("quack", () => _$escape(false, true), false)
);
const template59 = _$ssr(_tmpl$43, "true");
const template60 = _$ssr(_tmpl$44, "true");
const template61 = _$ssr(_tmpl$45, "true");
// this crash it for some reason- */ const template62 = <div bool:quack>really empty</div>;

const template63 = _$ssr(_tmpl$46);
const template64 = _$ssr(_tmpl$47);
const template65 = _$ssr(_tmpl$48);
const template66 = _$ssr(_tmpl$49);
const template67 = _$ssr(_tmpl$50);
const template68 = _$ssr(_tmpl$51);
const template69 = _$ssr(_tmpl$52);
const template70 = _$ssr(_tmpl$53);
const template71 = _$ssr(_tmpl$54);
const template72 = _$ssr(_tmpl$9);
const template73 = _$ssr(_tmpl$9);
const template74 = _$ssr(_tmpl$9);
const template75 = _$ssr(_tmpl$9);
const template76 = _$ssr(_tmpl$9);
const template77 = _$ssr(_tmpl$55);
const template78 = _$ssr(_tmpl$56);
const template79 = _$ssr(_tmpl$9);
const template80 = _$ssr(
  _tmpl$57,
  _$ssrAttribute("true", _$escape(true, true), false) +
    _$ssrAttribute("false", _$escape(false, true), false)
);
const template81 = _$ssr(
  _tmpl$58,
  _$ssrAttribute("i", _$escape(undefined, true), false) +
    _$ssrAttribute("j", _$escape(null, true), false) +
    _$ssrAttribute("k", void 0, false)
);
const css = () => "&{color:red}";
const template82 = [
  _$ssr(_tmpl$59, css()),
  _$ssr(_tmpl$59, css()),
  _$ssr(_tmpl$59, css()),
  _$ssr(_tmpl$59, css()),
  _$ssr(_tmpl$59, css())
];
const styleProps = {
  children: css
};
const template83 = [
  _$ssrElement("style", styleProps(), css(), false),
  _$ssrElement(
    "style",
    _$mergeProps(styleProps, {
      get children() {
        return css();
      }
    }),
    undefined,
    false
  ),
  _$ssrElement(
    "style",
    _$mergeProps(styleProps, {
      get innerHTML() {
        return css();
      }
    }),
    undefined,
    false
  ),
  _$ssrElement(
    "style",
    _$mergeProps(styleProps, {
      get innerText() {
        return css();
      }
    }),
    undefined,
    false
  ),
  _$ssrElement(
    "style",
    _$mergeProps(styleProps, {
      get textContent() {
        return css();
      }
    }),
    undefined,
    false
  )
];
