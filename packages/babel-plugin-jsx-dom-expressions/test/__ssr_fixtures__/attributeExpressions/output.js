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
  _tmpl$5 = ['<div class="', '"></div>'],
  _tmpl$6 = ['<div style="', '">Hi</div>'],
  _tmpl$7 = ['<div style="', '"', "></div>"],
  _tmpl$8 = "<div></div>",
  _tmpl$9 = ['<div onclick="', '"></div>'],
  _tmpl$10 = '<input type="checkbox" checked>',
  _tmpl$11 = ['<input type="checkbox"', ">"],
  _tmpl$12 = '<div class="`a">`$`</div>',
  _tmpl$13 = ['<button class="', '" type="button">Write</button>'],
  _tmpl$14 = ['<button class="', '">Hi</button>'],
  _tmpl$15 = ["<div><input", " readonly><input", "", "></div>"],
  _tmpl$16 = ['<div style="', '"></div>'],
  _tmpl$17 = '<div data="&quot;hi&quot;" data2="&quot;"></div>',
  _tmpl$18 = ["<div", ">", "</div>"],
  _tmpl$19 = ["<div>", "", "</div>"],
  _tmpl$20 =
    '<div class="class1 class2 class3 class4 class5 class6" style="color:red;background-color:blue !important;border:1px solid black;font-size:12px;" random="random1 random2\n    random3 random4"></div>',
  _tmpl$21 = ["<button", "></button>"],
  _tmpl$22 = '<input value="10">',
  _tmpl$23 = ["<select", "><option", ">Red</option><option", ">Blue</option></select>"],
  _tmpl$24 = ['<div a a a checked a="true" a="false" a="0" a a', " a></div>"],
  _tmpl$25 = ["<style>", "</style>"],
  _tmpl$26 = ["<video", "></video>"],
  _tmpl$27 = "<video playsinline></video>",
  _tmpl$28 = "<video></video>";
import * as styles from "./styles.module.css";
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
      classList: {
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
        get ["class"]() {
          return `base ${dynamic() ? "dynamic" : ""} ${selected ? "selected" : ""}`;
        },
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
const template4 = _$ssr(_tmpl$5, `hi ${_$escape(state.class, true) || ""} ccc:ddd`);
const template5 = _$ssr(_tmpl$5, `a b`);
const template6 = _$ssr(_tmpl$6, _$ssrStyle(someStyle()));
let undefVar;
const template7 = _$ssr(
  _tmpl$7,
  _$ssrStyle({
    "background-color": color(),
    "margin-right": "40px",
    ...props.style,
    "padding-top": props.top
  }),
  _$ssrAttribute("other-class", _$escape(undefVar, true), false)
);
let refTarget;
const template8 = _$ssr(_tmpl$8);
const template9 = _$ssr(_tmpl$8);
const template10 = _$ssr(_tmpl$8);
const template11 = _$ssr(_tmpl$8);
const template12 = _$ssr(_tmpl$9, "console.log('hi')");
const template13 = _$ssr(_tmpl$10);
const template14 = _$ssr(_tmpl$11, _$ssrAttribute("checked", state.visible, true));
const template15 = _$ssr(_tmpl$12);
const template16 = _$ssr(_tmpl$13, `static ${"k" ? "hi" : ""}`);
const template17 = _$ssr(_tmpl$14, "a  b  c");
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
const template19 = _$ssr(_tmpl$5, `bg-red-500 flex flex-col`);
const template20 = _$ssr(
  _tmpl$15,
  _$ssrAttribute("value", _$escape(s(), true), false) +
    _$ssrAttribute("min", _$escape(min(), true), false) +
    _$ssrAttribute("max", _$escape(max(), true), false),
  _$ssrAttribute("checked", s2(), true) +
    _$ssrAttribute("min", _$escape(min(), true), false) +
    _$ssrAttribute("max", _$escape(max(), true), false),
  _$ssrAttribute("readonly", value, true)
);
const template21 = _$ssr(
  _tmpl$16,
  _$ssrStyle({
    a: "static",
    ...rest
  })
);
const template22 = _$ssr(_tmpl$17);
const template23 = _$ssr(
  _tmpl$18,
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
  _tmpl$19,
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
const template29 = _$ssr(_tmpl$18, _$ssrAttribute("attribute", !!someValue, false), !!someValue);
const template30 = _$ssr(_tmpl$20);
const template31 = _$ssr(
  _tmpl$16,
  "background-color:" + _$escape(getStore.itemProperties.color, true)
);
const template32 = _$ssr(_tmpl$16, "background-color:" + _$escape(undefined, true));
const template33 = [
  _$ssr(_tmpl$21, _$ssrAttribute("class", _$escape(styles.button, true), false)),
  _$ssr(_tmpl$21, _$ssrAttribute("class", _$escape(styles["foo--bar"], true), false)),
  _$ssr(_tmpl$21, _$ssrAttribute("class", _$escape(styles.foo.bar, true), false)),
  _$ssr(_tmpl$21, _$ssrAttribute("class", _$escape(styles[foo()], true), false))
];
const template34 = _$ssrElement("div", somethingElse, undefined, false);
const template35 = _$ssr(_tmpl$8);
const template36 = _$ssr(_tmpl$8);
const template37 = _$ssr(_tmpl$8);
const template38 = _$ssr(_tmpl$8);
const template39 = _$ssr(_tmpl$22);
const template40 = _$ssr(_tmpl$16, "color:" + _$escape(a(), true));
const template41 = _$ssr(
  _tmpl$23,
  _$ssrAttribute("value", _$escape(state.color, true), false),
  _$ssrAttribute("value", _$escape(Color.Red, true), false),
  _$ssrAttribute("value", _$escape(Color.Blue, true), false)
);
const template42 = _$ssr(
  _tmpl$24,
  _$ssrAttribute("a", _$escape(undefined, true), false) +
    _$ssrAttribute("a", _$escape(null, true), false) +
    _$ssrAttribute("a", void 0, false)
);
const css = () => "&{color:red}";
const template43 = [
  _$ssr(_tmpl$25, css()),
  _$ssr(_tmpl$25, css()),
  _$ssr(_tmpl$25, css()),
  _$ssr(_tmpl$25, css()),
  _$ssr(_tmpl$25, css())
];
const styleProps = {
  children: css
};
const template44 = [
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
const template45 = _$ssr(_tmpl$26, _$ssrAttribute("playsinline", value, true));
const template46 = _$ssr(_tmpl$27);
const template47 = _$ssr(_tmpl$28);
const template48 = _$ssr(_tmpl$26, _$ssrAttribute("playsinline", _$escape(value, true), false));
const template49 = _$ssr(_tmpl$27);
const template50 = _$ssr(_tmpl$28);