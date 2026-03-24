import { memo as _$memo } from "r-server";
import { ssrClassName as _$ssrClassName } from "r-server";
import { ssrStyle as _$ssrStyle } from "r-server";
import { ssrStyleProperty as _$ssrStyleProperty } from "r-server";
import { ssrAttribute as _$ssrAttribute } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
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
  _tmpl$10 = "<div onclick=\"console.log('hi')\"></div>",
  _tmpl$11 = '<input type="checkbox" checked>',
  _tmpl$12 = ['<input type="checkbox"', ">"],
  _tmpl$13 = '<div class="`a">`$`</div>',
  _tmpl$14 = ['<button class="', '" type="button">Write</button>'],
  _tmpl$15 = ['<button class="', '">Hi</button>'],
  _tmpl$16 = ['<div class="', '"></div>'],
  _tmpl$17 = ["<div><input", "", " readonly", "><input", "", "", "", "></div>"],
  _tmpl$18 = ['<div style="', '"></div>'],
  _tmpl$19 = '<div data="&quot;hi&quot;" data2="&quot;"></div>',
  _tmpl$20 = ["<div", ">", "</div>"],
  _tmpl$21 = ["<div>", "", "</div>"],
  _tmpl$22 =
    '<div class="class1 class2 class3 class4 class5 class6" style="color:red;background-color:blue !important;border:1px solid black;font-size:12px;" random="random1 random2\n    random3 random4"></div>',
  _tmpl$23 = ['<button class="', '"></button>'],
  _tmpl$24 = '<input value="10">',
  _tmpl$25 = ["<select", "><option", ">Red</option><option", ">Blue</option></select>"],
  _tmpl$26 = "<img src>",
  _tmpl$27 = "<div><img src></div>",
  _tmpl$28 = '<img src loading="lazy">',
  _tmpl$29 = '<div><img src loading="lazy"></div>',
  _tmpl$30 = "<iframe src></iframe>",
  _tmpl$31 = "<div><iframe src></iframe></div>",
  _tmpl$32 = '<iframe src loading="lazy"></iframe>',
  _tmpl$33 = '<div><iframe src loading="lazy"></iframe></div>',
  _tmpl$34 = '<div title="<u>data</u>"></div>',
  _tmpl$35 = '<div true truestr="true" truestrjs="true"></div>',
  _tmpl$36 = '<div falsestr="false" falsestrjs="false"></div>',
  _tmpl$37 = "<div true></div>",
  _tmpl$38 = ['<div a b c d f="0" g h', "", "", " l></div>"],
  _tmpl$39 = '<math display="block"><mrow></mrow></math>',
  _tmpl$40 = "<mrow><mi>x</mi><mo>=</mo></mrow>",
  _tmpl$41 = ["<video", "></video>"],
  _tmpl$42 = "<video playsinline></video>",
  _tmpl$43 = "<video></video>",
  _tmpl$44 = '<video poster="1.jpg"></video>',
  _tmpl$45 = '<div><video poster="1.jpg"></video></div>',
  _tmpl$46 = "<div><video></video></div>",
  _tmpl$47 = ['<button type="button"', ' style="', '" class="', '">', "</button>"],
  _tmpl$48 = ["<style>", "</style>"],
  _tmpl$49 = ['<div class="bg-(--bg)" style="', '"></div>'],
  _tmpl$50 = ['<div class="progress-fill" style="', '"></div>'];
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
    (() => {
      var _ref$ = link;
      return _$ssr(_tmpl$, "ccc ddd");
    })(),
    false
  ),
  false
);
const template2 = _$ssrElement(
  "div",
  getProps("test"),
  [
    (() => {
      var _v$ = _$escape(rowId);
      return _$ssr(_tmpl$2, _v$);
    })(),
    (() => {
      var _v$2 = _$ssrRunInScope(() => _$escape(row.label));
      return _$ssr(_tmpl$2, _v$2);
    })(),
    _$ssr(_tmpl$3)
  ],
  false
);
const template3 = (() => {
  var _v$4 = _$escape(state.content),
    _v$3 = _$ssrRunInScope([() => _$ssrAttribute("name", _$escape(state.name, true))]);
  return _$ssr(
    _tmpl$4,
    _$ssrAttribute("id", _$escape(state.id, true)),
    _$ssrStyleProperty("background-color:", _$escape(state.color, true)),
    _v$3[0],
    _v$4
  );
})();
const template4 = (() => {
  var _v$5 = _$ssrRunInScope([() => _$ssrAttribute("className", _$escape(state.class, true))]);
  return _$ssr(_tmpl$5, _v$5[0], "ccc:ddd");
})();
const template5 = _$ssr(_tmpl$6);
const template6 = (() => {
  var _v$6 = _$ssrRunInScope([() => _$ssrStyle(someStyle())]);
  return _$ssr(_tmpl$7, _v$6[0]);
})();
let undefVar;
const template7 = (() => {
  var _v$7 = _$ssrRunInScope([
    () =>
      _$ssrStyle({
        "background-color": color(),
        "margin-right": "40px",
        ...props.style,
        "padding-top": props.top
      })
  ]);
  return _$ssr(_tmpl$8, _v$7[0], _$ssrAttribute("other-class", _$escape(undefVar, true)));
})();
let refTarget;
const template8 = (() => {
  var _ref$2 = refTarget;
  return _$ssr(_tmpl$9);
})();
const template9 = (() => {
  var _ref$3 = e => console.log(e);
  return _$ssr(_tmpl$9);
})();
const template10 = (() => {
  var _ref$4 = refFactory();
  return _$ssr(_tmpl$9);
})();
const template12 = _$ssr(_tmpl$10);
const template13 = _$ssr(_tmpl$11);
const template14 = (() => {
  var _v$8 = _$ssrRunInScope([() => _$ssrAttribute("checked", _$escape(state.visible, true))]);
  return _$ssr(_tmpl$12, _v$8[0]);
})();
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
const template20 = (() => {
  var _v$9 = _$ssrRunInScope([
    () => _$ssrAttribute("min", _$escape(min(), true)),
    () => _$ssrAttribute("max", _$escape(max(), true)),
    () => _$ssrAttribute("value", _$escape(s(), true)),
    () => _$ssrAttribute("min", _$escape(min(), true)),
    () => _$ssrAttribute("max", _$escape(max(), true)),
    () => _$ssrAttribute("checked", _$escape(s2(), true))
  ]);
  return _$ssr(
    _tmpl$17,
    _v$9[0],
    _v$9[1],
    _v$9[2],
    _v$9[3],
    _v$9[4],
    _$ssrAttribute("readonly", _$escape(value, true)),
    _v$9[5]
  );
})();
const template21 = (() => {
  var _v$10 = _$ssrRunInScope([
    () =>
      _$ssrStyle({
        a: "static",
        ...rest
      })
  ]);
  return _$ssr(_tmpl$18, _v$10[0]);
})();
const template22 = _$ssr(_tmpl$19);
const template23 = (() => {
  var _v$12 = _$ssrRunInScope(() => "t" in test && "true"),
    _v$11 = _$ssrRunInScope([() => _$ssrAttribute("disabled", "t" in _$escape(test, true))]);
  return _$ssr(_tmpl$20, _v$11[0], _v$12);
})();
const template24 = _$ssrElement(
  "a",
  _$mergeProps(props, {
    something: true
  }),
  undefined,
  false
);
const template25 = (() => {
  var _v$13 = _$ssrRunInScope(() => _$escape(props.children)),
    _v$14 = _$ssrElement(
      "a",
      _$mergeProps(props, {
        something: true
      }),
      undefined,
      false
    );
  return _$ssr(_tmpl$21, _v$13, _v$14);
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
    _$ssrElement("span", api(), ["Input is ", () => (api() ? "checked" : "unchecked")], false),
    _$ssrElement("input", api(), undefined, false),
    _$ssrElement("div", api(), undefined, false)
  ],
  false
);
const template29 = (() => {
  var _v$15 = !!someValue;
  return _$ssr(_tmpl$20, _$ssrAttribute("attribute", !!someValue), _v$15);
})();
const template30 = _$ssr(_tmpl$22);
const template31 = (() => {
  var _v$16 = _$ssrRunInScope([
    () => _$ssrStyleProperty("background-color:", _$escape(getStore.itemProperties.color, true))
  ]);
  return _$ssr(_tmpl$18, _v$16[0]);
})();
const template32 = _$ssr(
  _tmpl$18,
  _$ssrStyleProperty("background-color:", _$escape(undefined, true))
);
const template33 = [
  _$ssr(_tmpl$23, _$ssrClassName(styles.button)),
  _$ssr(_tmpl$23, _$ssrClassName(styles["foo--bar"])),
  (() => {
    var _v$17 = _$ssrRunInScope([() => _$ssrClassName(styles.foo.bar)]);
    return _$ssr(_tmpl$23, _v$17[0]);
  })(),
  (() => {
    var _v$18 = _$ssrRunInScope([() => _$ssrClassName(styles[foo()])]);
    return _$ssr(_tmpl$23, _v$18[0]);
  })()
];
const template35 = (() => {
  var _ref$5 = a().b.c;
  return _$ssr(_tmpl$9);
})();
const template36 = (() => {
  var _ref$6 = a().b?.c;
  return _$ssr(_tmpl$9);
})();
const template37 = (() => {
  var _ref$7 = a() ? b : c;
  return _$ssr(_tmpl$9);
})();
const template38 = (() => {
  var _ref$8 = a() ?? b;
  return _$ssr(_tmpl$9);
})();
const template39 = _$ssr(_tmpl$24);
const template40 = (() => {
  var _v$19 = _$ssrRunInScope([() => _$ssrStyleProperty("color:", _$escape(a(), true))]);
  return _$ssr(_tmpl$18, _v$19[0]);
})();
const template41 = (() => {
  var _v$20 = _$ssrRunInScope([
    () => _$ssrAttribute("value", _$escape(state.color, true)),
    () => _$ssrAttribute("value", _$escape(Color.Red, true)),
    () => _$ssrAttribute("value", _$escape(Color.Blue, true))
  ]);
  return _$ssr(_tmpl$25, _v$20[0], _v$20[1], _v$20[2]);
})();
const template42 = _$ssr(_tmpl$26);
const template43 = _$ssr(_tmpl$27);
const template44 = _$ssr(_tmpl$28);
const template45 = _$ssr(_tmpl$29);
const template46 = _$ssr(_tmpl$30);
const template47 = _$ssr(_tmpl$31);
const template48 = _$ssr(_tmpl$32);
const template49 = _$ssr(_tmpl$33);
const template50 = _$ssr(_tmpl$34);
const template51 = (() => {
  var _ref$9 = binding;
  return _$ssr(_tmpl$9);
})();
const template52 = (() => {
  var _ref$10 = binding.prop;
  return _$ssr(_tmpl$9);
})();
const template53 = (() => {
  var _ref$11 = refFn;
  return _$ssr(_tmpl$9);
})();
const template54 = (() => {
  var _ref$12 = refConst;
  return _$ssr(_tmpl$9);
})();
const template55 = (() => {
  var _ref$13 = refUnknown;
  return _$ssr(_tmpl$9);
})();
const template56 = _$ssr(_tmpl$35);
const template57 = _$ssr(_tmpl$36);
const template58 = _$ssr(_tmpl$9);
const template59 = _$ssr(_tmpl$37);
const template60 = _$ssr(
  _tmpl$38,
  _$ssrAttribute("i", _$escape(undefined, true)),
  _$ssrAttribute("j", _$escape(null, true)),
  _$ssrAttribute("k", void 0)
);
const template61 = _$ssr(_tmpl$39);
const template62 = _$ssr(_tmpl$40);
const template63 = _$ssr(_tmpl$18, _$ssrStyleProperty("background:", "red"));
const template64 = _$ssr(
  _tmpl$18,
  _$ssrStyleProperty("background:", "red") +
    _$ssrStyleProperty(";color:", "green") +
    _$ssrStyleProperty(";margin:", 3) +
    _$ssrStyleProperty(";padding:", 0.4)
);
const template65 = _$ssr(
  _tmpl$18,
  _$ssrStyleProperty("background:", "red") +
    _$ssrStyleProperty(";color:", "green") +
    _$ssrStyleProperty(";border:", _$escape(undefined, true))
);
const template66 = (() => {
  var _v$21 = _$ssrRunInScope([
    () =>
      _$ssrStyleProperty("background:", "red") +
      _$ssrStyleProperty(";color:", "green") +
      _$ssrStyleProperty(";border:", _$escape(signal(), true))
  ]);
  return _$ssr(_tmpl$18, _v$21[0]);
})();
const template67 = _$ssr(
  _tmpl$18,
  _$ssrStyleProperty("background:", "red") +
    _$ssrStyleProperty(";color:", "green") +
    _$ssrStyleProperty(";border:", _$escape(somevalue, true))
);
const template68 = (() => {
  var _v$22 = _$ssrRunInScope([
    () =>
      _$ssrStyleProperty("background:", "red") +
      _$ssrStyleProperty(";color:", "green") +
      _$ssrStyleProperty(";border:", _$escape(some.access, true))
  ]);
  return _$ssr(_tmpl$18, _v$22[0]);
})();
const template69 = _$ssr(
  _tmpl$18,
  _$ssrStyleProperty("background:", "red") +
    _$ssrStyleProperty(";color:", "green") +
    _$ssrStyleProperty(";border:", _$escape(null, true))
);
const template70 = _$ssr(_tmpl$41, _$ssrAttribute("playsinline", _$escape(value, true)));
const template71 = _$ssr(_tmpl$42);
const template72 = _$ssr(_tmpl$43);
const template73 = _$ssr(_tmpl$44);
const template74 = _$ssr(_tmpl$45);
const template75 = _$ssr(_tmpl$43);
const template76 = _$ssr(_tmpl$46);

// ONCE TESTS

const template77 = _$ssr(
  _tmpl$18,
  _$ssrStyleProperty("width:", _$escape(props.width, true)) +
    _$ssrStyleProperty(";height:", _$escape(props.height, true))
);
const template78 = (() => {
  var _v$23 = _$ssrRunInScope([() => _$ssrAttribute("something", _$escape(color(), true))]);
  return _$ssr(
    _tmpl$8,
    _$ssrStyleProperty("width:", _$escape(props.width, true)) +
      _$ssrStyleProperty(";height:", _$escape(props.height, true)),
    _v$23[0]
  );
})();
const template79 = (() => {
  var _v$24 = _$ssrRunInScope([
    () =>
      _$ssrStyleProperty("width:", _$escape(props.width, true)) +
      _$ssrStyleProperty(";height:", _$escape(props.height, true))
  ]);
  return _$ssr(_tmpl$8, _v$24[0], _$ssrAttribute("something", _$escape(color(), true)));
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
const template80 = _$ssrElement("div", propsSpread, undefined, false);
const template81 = _$ssrElement("div", propsSpread, undefined, false);
const template82 = _$ssrElement(
  "div",
  _$mergeProps(propsSpread, {
    get ["data-dynamic"]() {
      return color();
    },
    "data-static": color()
  }),
  undefined,
  false
);
const template83 = _$ssrElement(
  "div",
  _$mergeProps(propsSpread, {
    get ["data-dynamic"]() {
      return color();
    },
    "data-static": color()
  }),
  undefined,
  false
);
const template84 = _$ssrElement(
  "div",
  _$mergeProps(propsSpread1, propsSpread2, propsSpread3, {
    get ["data-dynamic"]() {
      return color();
    },
    "data-static": color()
  }),
  undefined,
  false
);

// ONCE PROPERTY OF OBJECT ACCESS

// https://github.com/ryansolid/dom-expressions/issues/252#issuecomment-1572220563
const styleProp = {
  style: {
    width: props.width,
    height: props.height
  }
};
const template85 = _$ssr(_tmpl$18, _$ssrStyle(styleProp.style));
const template86 = (() => {
  var _v$25 = _$ssrRunInScope([() => _$ssrStyle(styleProp.style)]);
  return _$ssr(_tmpl$18, _v$25[0]);
})();
const style = {
  background: "red",
  border: "solid black " + count() + "px"
};
const template87 = (() => {
  var _v$27 = _$ssrRunInScope(() => _$escape(count())),
    _v$26 = _$ssrRunInScope([() => _$ssrAttribute("aria-label", _$escape(count(), true))]);
  return _$ssr(_tmpl$47, _v$26[0], _$ssrStyle(style), _$ssrClassName(style), _v$27);
})();
const template88 = (() => {
  var _v$29 = _$ssrRunInScope(() => _$escape(count())),
    _v$28 = _$ssrRunInScope([() => _$ssrAttribute("aria-label", _$escape(count(), true))]);
  return _$ssr(_tmpl$47, _v$28[0], _$ssrStyle(style), _$ssrClassName(style), _v$29);
})();
const css = () => "&{color:red}";
const template89 = [
  (() => {
    var _v$30 = _$ssrRunInScope(() => css());
    return _$ssr(_tmpl$48, _v$30);
  })(),
  (() => {
    var _v$31 = _$ssrRunInScope(() => css());
    return _$ssr(_tmpl$48, _v$31);
  })(),
  (() => {
    var _v$32 = _$ssrRunInScope(() => css());
    return _$ssr(_tmpl$48, _v$32);
  })(),
  (() => {
    var _v$33 = _$ssrRunInScope(() => css());
    return _$ssr(_tmpl$48, _v$33);
  })(),
  (() => {
    var _v$34 = _$ssrRunInScope(() => css());
    return _$ssr(_tmpl$48, _v$34);
  })()
];
const styleProps = {
  children: css
};
const template90 = [
  _$ssrElement("style", styleProps(), () => css(), false),
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
const nope = () => undefined;
const template91 = (() => {
  var _v$35 = _$ssrRunInScope([() => _$ssrStyleProperty("--bg:", _$escape(nope(), true))]);
  return _$ssr(_tmpl$49, _v$35[0]);
})();
const template92 = _$ssr(_tmpl$9);
function Progress(props) {
  return (() => {
    var _v$36 = _$ssrRunInScope([
      () =>
        _$ssrStyleProperty(
          (props.orientation === "y" ? "height" : "width") + ":",
          `${_$escape(props.value, true) * 100}%`
        )
    ]);
    return _$ssr(_tmpl$50, _v$36[0]);
  })();
}