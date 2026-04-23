import { ssrElement as _$ssrElement } from "r-server";
import { memo as _$memo } from "r-server";
import { For as _$For } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { mergeProps as _$mergeProps } from "r-server";
import { applyRef as _$applyRef } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { escape as _$escape } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
var _tmpl$ = ["<div", ">Hello <!--$-->", "<!--/--></div>"],
  _tmpl$2 = ["<div", ">", "</div>"],
  _tmpl$3 = ["<div", ">From Parent</div>"],
  _tmpl$4 = ["<div", "><!--$-->", "<!--/--><!--$-->", "<!--/--><!--$-->", "<!--/--></div>"],
  _tmpl$5 = ["<div", "></div>"],
  _tmpl$6 = [
    "<div",
    "><!--$-->",
    "<!--/--> | <!--$-->",
    "<!--/--> | <!--$-->",
    "<!--/--> | <!--$-->",
    "<!--/--> | <!--$-->",
    "<!--/--> | <!--$-->",
    "<!--/--></div>"
  ],
  _tmpl$7 = [
    "<div",
    "><!--$-->",
    "<!--/--> | <!--$-->",
    "<!--/--><!--$-->",
    "<!--/--> | <!--$-->",
    "<!--/--><!--$-->",
    "<!--/--> | <!--$-->",
    "<!--/--></div>"
  ],
  _tmpl$8 = ["<div", "> | <!--$-->", "<!--/--> |  |  | <!--$-->", "<!--/--> | </div>"],
  _tmpl$9 = ["<span", ">1</span>"],
  _tmpl$10 = ["<span", ">2</span>"],
  _tmpl$11 = ["<span", ">3</span>"];
import { Show } from "somewhere";
const Child = props => {
  const [s, set] = createSignal();
  return [
    (() => {
      var _v$ = _$ssrHydrationKey(),
        _ref$ = props.ref,
        _v$2 = _$ssrRunInScope(() => _$escape(props.name));
      return _$ssr(_tmpl$, _v$, _v$2);
    })(),
    (() => {
      var _v$3 = _$ssrHydrationKey(),
        _ref$2 = set,
        _v$4 = _$ssrRunInScope(() => _$escape(props.children));
      return _$ssr(_tmpl$2, _v$3, _v$4);
    })()
  ];
};
const template = props => {
  let childRef;
  const { content } = props;
  return (() => {
    var _v$5 = _$ssrHydrationKey(),
      _v$7 = _$escape(
        _$createComponent(
          Child,
          _$mergeProps(
            {
              name: "John"
            },
            props,
            {
              ref(r$) {
                var _ref$3 = childRef;
                typeof _ref$3 === "function" || Array.isArray(_ref$3)
                  ? _$applyRef(_ref$3, r$)
                  : (childRef = r$);
              },
              booleanProperty: true,
              get children() {
                var _v$6 = _$ssrHydrationKey();
                return _$ssr(_tmpl$3, _v$6);
              }
            }
          )
        )
      ),
      _v$10 = _$escape(
        _$createComponent(
          Child,
          _$mergeProps(
            {
              name: "Jason"
            },
            dynamicSpread,
            {
              ref(r$) {
                var _ref$4 = props.ref;
                typeof _ref$4 === "function" || Array.isArray(_ref$4)
                  ? _$applyRef(_ref$4, r$)
                  : (props.ref = r$);
              },
              get children() {
                var _v$8 = _$ssrHydrationKey(),
                  _v$9 = _$escape(content);
                return _$ssr(_tmpl$2, _v$8, _v$9);
              }
            }
          )
        )
      ),
      _v$11 = (() => {
        var _ref$5 = props.consumerRef();
        return _$escape(
          _$createComponent(Context.Consumer, {
            ref(r$) {
              (typeof _ref$5 === "function" || Array.isArray(_ref$5)) && _$applyRef(_ref$5, r$);
            },
            children: context => context
          })
        );
      })();
    return _$ssr(_tmpl$4, _v$5, _v$7, _v$10, _v$11);
  })();
};
const template2 = _$createComponent(Child, {
  name: "Jake",
  get dynamic() {
    return state.data;
  },
  stale: state.data,
  handleClick: clickHandler,
  get ["hyphen-ated"]() {
    return state.data;
  },
  ref: el => (e = el)
});
const template3 = _$createComponent(Child, {
  get children() {
    return [
      (() => {
        var _v$12 = _$ssrHydrationKey();
        return _$ssr(_tmpl$5, _v$12);
      })(),
      (() => {
        var _v$13 = _$ssrHydrationKey();
        return _$ssr(_tmpl$5, _v$13);
      })(),
      (() => {
        var _v$14 = _$ssrHydrationKey();
        return _$ssr(_tmpl$5, _v$14);
      })(),
      "After"
    ];
  }
});
const [s, set] = createSignal();
const template4 = _$createComponent(Child, {
  ref: set,
  get children() {
    return (() => {
      var _v$15 = _$ssrHydrationKey();
      return _$ssr(_tmpl$5, _v$15);
    })();
  }
});
const template5 = _$createComponent(Child, {
  get dynamic() {
    return state.dynamic;
  },
  get children() {
    return state.dynamic;
  }
});

// builtIns
const template6 = _$createComponent(_$For, {
  get each() {
    return state.list;
  },
  get fallback() {
    return _$createComponent(Loading, {});
  },
  children: item =>
    _$createComponent(Show, {
      get when() {
        return state.condition;
      },
      children: item
    })
});
const template7 = _$createComponent(Child, {
  get children() {
    return [
      (() => {
        var _v$16 = _$ssrHydrationKey();
        return _$ssr(_tmpl$5, _v$16);
      })(),
      _$memo(() => _$escape(state.dynamic))
    ];
  }
});
const template8 = _$createComponent(Child, {
  get children() {
    return [item => item, item => item];
  }
});
const template9 = _$createComponent(_garbage, {
  children: "Hi"
});
const template10 = (() => {
  var _v$17 = _$ssrHydrationKey(),
    _v$18 = _$escape(
      _$createComponent(Link, {
        children: "new"
      })
    ),
    _v$19 = _$escape(
      _$createComponent(Link, {
        children: "comments"
      })
    ),
    _v$20 = _$escape(
      _$createComponent(Link, {
        children: "show"
      })
    ),
    _v$21 = _$escape(
      _$createComponent(Link, {
        children: "ask"
      })
    ),
    _v$22 = _$escape(
      _$createComponent(Link, {
        children: "jobs"
      })
    ),
    _v$23 = _$escape(
      _$createComponent(Link, {
        children: "submit"
      })
    );
  return _$ssr(_tmpl$6, _v$17, _v$18, _v$19, _v$20, _v$21, _v$22, _v$23);
})();
const template11 = (() => {
  var _v$24 = _$ssrHydrationKey(),
    _v$25 = _$escape(
      _$createComponent(Link, {
        children: "new"
      })
    ),
    _v$26 = _$escape(
      _$createComponent(Link, {
        children: "comments"
      })
    ),
    _v$27 = _$escape(
      _$createComponent(Link, {
        children: "show"
      })
    ),
    _v$28 = _$escape(
      _$createComponent(Link, {
        children: "ask"
      })
    ),
    _v$29 = _$escape(
      _$createComponent(Link, {
        children: "jobs"
      })
    ),
    _v$30 = _$escape(
      _$createComponent(Link, {
        children: "submit"
      })
    );
  return _$ssr(_tmpl$7, _v$24, _v$25, _v$26, _v$27, _v$28, _v$29, _v$30);
})();
const template12 = (() => {
  var _v$31 = _$ssrHydrationKey(),
    _v$32 = _$escape(
      _$createComponent(Link, {
        children: "comments"
      })
    ),
    _v$33 = _$escape(
      _$createComponent(Link, {
        children: "show"
      })
    );
  return _$ssr(_tmpl$8, _v$31, _v$32, _v$33);
})();
class Template13 {
  render() {
    const _self$ = this;
    _$createComponent(Component, {
      get prop() {
        return _self$.something;
      },
      onClick: () => _self$.shouldStay,
      get children() {
        return _$createComponent(Nested, {
          get prop() {
            return _self$.data;
          },
          get children() {
            return _self$.content;
          }
        });
      }
    });
  }
}
const Template14 = _$createComponent(Component, {
  get children() {
    return data();
  }
});
const Template15 = _$createComponent(Component, props);
const Template16 = _$createComponent(
  Component,
  _$mergeProps(
    {
      something: something
    },
    props
  )
);
const Template17 = _$createComponent(Pre, {
  get children() {
    return [
      (() => {
        var _v$34 = _$ssrHydrationKey();
        return _$ssr(_tmpl$9, _v$34);
      })(),
      " ",
      (() => {
        var _v$35 = _$ssrHydrationKey();
        return _$ssr(_tmpl$10, _v$35);
      })(),
      " ",
      (() => {
        var _v$36 = _$ssrHydrationKey();
        return _$ssr(_tmpl$11, _v$36);
      })()
    ];
  }
});
const Template18 = _$createComponent(Pre, {
  get children() {
    return [
      (() => {
        var _v$37 = _$ssrHydrationKey();
        return _$ssr(_tmpl$9, _v$37);
      })(),
      (() => {
        var _v$38 = _$ssrHydrationKey();
        return _$ssr(_tmpl$10, _v$38);
      })(),
      (() => {
        var _v$39 = _$ssrHydrationKey();
        return _$ssr(_tmpl$11, _v$39);
      })()
    ];
  }
});
const Template19 = _$createComponent(
  Component,
  _$mergeProps(() => s.dynamic())
);
const Template20 = _$createComponent(Component, {
  get ["class"]() {
    return prop.red ? "red" : "green";
  }
});
const template21 = _$createComponent(
  Component,
  _$mergeProps(() => ({
    get [key()]() {
      return props.value;
    }
  }))
);
const template22 = _$createComponent(Component, {
  get passObject() {
    return {
      ...a
    };
  }
});
const template23 = _$createComponent(Component, {
  get disabled() {
    return "t" in test;
  },
  get children() {
    return "t" in test && "true";
  }
});
const template24 = _$createComponent(Component, {
  get children() {
    return _$escape(state.dynamic);
  }
});
const template25 = _$createComponent(Component, {
  get children() {
    var _v$40 = _$ssrHydrationKey();
    return _$ssr(_tmpl$5, _v$40);
  }
});
function MyComponent(props) {
  let el;
  const others = omit(props, "children");
  return _$ssrElement("div", others, () => () => _$escape(props.children), true);
}
