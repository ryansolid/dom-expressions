import { memo as _$memo } from "r-custom";
import { For as _$For } from "r-custom";
import { createComponent as _$createComponent } from "r-custom";
import { mergeProps as _$mergeProps } from "r-custom";
import { insert as _$insert } from "r-custom";
import { createTextNode as _$createTextNode } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { use as _$use } from "r-custom";
import { createElement as _$createElement } from "r-custom";
import { Show } from "somewhere";
const Child = props => [
  (() => {
    const _el$ = _$createElement("div"),
      _el$2 = _$createTextNode(`Hello `);
    _$insertNode(_el$, _el$2);
    const _ref$ = props.ref;
    typeof _ref$ === "function" ? _$use(_ref$, _el$) : (props.ref = _el$);
    _$insert(_el$, () => props.name, null);
    return _el$;
  })(),
  (() => {
    const _el$3 = _$createElement("div");
    _$insert(_el$3, () => props.children);
    return _el$3;
  })()
];
const template = props => {
  let childRef;
  const { content } = props;
  return (() => {
    const _el$4 = _$createElement("div");
    _$insert(
      _el$4,
      _$createComponent(
        Child,
        _$mergeProps(
          {
            name: "John"
          },
          props,
          {
            ref(r$) {
              const _ref$2 = childRef;
              typeof _ref$2 === "function" ? _ref$2(r$) : (childRef = r$);
            },
            booleanProperty: true,
            get children() {
              const _el$5 = _$createElement("div");
              _$insertNode(_el$5, _$createTextNode(`From Parent`));
              return _el$5;
            }
          }
        )
      ),
      null
    );
    _$insert(
      _el$4,
      _$createComponent(
        Child,
        _$mergeProps(
          {
            name: "Jason"
          },
          dynamicSpread,
          {
            ref(r$) {
              const _ref$3 = props.ref;
              typeof _ref$3 === "function" ? _ref$3(r$) : (props.ref = r$);
            },
            get children() {
              const _el$7 = _$createElement("div");
              _$insert(_el$7, content);
              return _el$7;
            }
          }
        )
      ),
      null
    );
    _$insert(
      _el$4,
      _$createComponent(Context.Consumer, {
        ref(r$) {
          const _ref$4 = props.consumerRef();
          typeof _ref$4 === "function" && _ref$4(r$);
        },
        children: context => context
      }),
      null
    );
    return _el$4;
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
    return [_$createElement("div"), _$createElement("div"), _$createElement("div"), "After"];
  }
});
const template4 = _$createComponent(Child, {
  get children() {
    return _$createElement("div");
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
    return [_$createElement("div"), _$memo(() => state.dynamic)];
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
  const _el$13 = _$createElement("div"),
    _el$14 = _$createTextNode(` | `),
    _el$15 = _$createTextNode(` | `),
    _el$16 = _$createTextNode(` | `),
    _el$17 = _$createTextNode(` | `),
    _el$18 = _$createTextNode(` | `);
  _$insertNode(_el$13, _el$14);
  _$insertNode(_el$13, _el$15);
  _$insertNode(_el$13, _el$16);
  _$insertNode(_el$13, _el$17);
  _$insertNode(_el$13, _el$18);
  _$insert(
    _el$13,
    _$createComponent(Link, {
      children: "new"
    }),
    _el$14
  );
  _$insert(
    _el$13,
    _$createComponent(Link, {
      children: "comments"
    }),
    _el$15
  );
  _$insert(
    _el$13,
    _$createComponent(Link, {
      children: "show"
    }),
    _el$16
  );
  _$insert(
    _el$13,
    _$createComponent(Link, {
      children: "ask"
    }),
    _el$17
  );
  _$insert(
    _el$13,
    _$createComponent(Link, {
      children: "jobs"
    }),
    _el$18
  );
  _$insert(
    _el$13,
    _$createComponent(Link, {
      children: "submit"
    }),
    null
  );
  return _el$13;
})();
const template11 = (() => {
  const _el$19 = _$createElement("div"),
    _el$20 = _$createTextNode(` | `),
    _el$21 = _$createTextNode(` | `),
    _el$22 = _$createTextNode(` | `);
  _$insertNode(_el$19, _el$20);
  _$insertNode(_el$19, _el$21);
  _$insertNode(_el$19, _el$22);
  _$insert(
    _el$19,
    _$createComponent(Link, {
      children: "new"
    }),
    _el$20
  );
  _$insert(
    _el$19,
    _$createComponent(Link, {
      children: "comments"
    }),
    _el$21
  );
  _$insert(
    _el$19,
    _$createComponent(Link, {
      children: "show"
    }),
    _el$21
  );
  _$insert(
    _el$19,
    _$createComponent(Link, {
      children: "ask"
    }),
    _el$22
  );
  _$insert(
    _el$19,
    _$createComponent(Link, {
      children: "jobs"
    }),
    _el$22
  );
  _$insert(
    _el$19,
    _$createComponent(Link, {
      children: "submit"
    }),
    null
  );
  return _el$19;
})();
const template12 = (() => {
  const _el$23 = _$createElement("div"),
    _el$24 = _$createTextNode(` | `),
    _el$25 = _$createTextNode(` |  |  | `),
    _el$28 = _$createTextNode(` | `);
  _$insertNode(_el$23, _el$24);
  _$insertNode(_el$23, _el$25);
  _$insertNode(_el$23, _el$28);
  _$insert(
    _el$23,
    _$createComponent(Link, {
      children: "comments"
    }),
    _el$25
  );
  _$insert(
    _el$23,
    _$createComponent(Link, {
      children: "show"
    }),
    _el$28
  );
  return _el$23;
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
        const _el$29 = _$createElement("span");
        _$insertNode(_el$29, _$createTextNode(`1`));
        return _el$29;
      })(),
      " ",
      (() => {
        const _el$31 = _$createElement("span");
        _$insertNode(_el$31, _$createTextNode(`2`));
        return _el$31;
      })(),
      " ",
      (() => {
        const _el$33 = _$createElement("span");
        _$insertNode(_el$33, _$createTextNode(`3`));
        return _el$33;
      })()
    ];
  }
});
const Template18 = _$createComponent(Pre, {
  get children() {
    return [
      (() => {
        const _el$35 = _$createElement("span");
        _$insertNode(_el$35, _$createTextNode(`1`));
        return _el$35;
      })(),
      (() => {
        const _el$37 = _$createElement("span");
        _$insertNode(_el$37, _$createTextNode(`2`));
        return _el$37;
      })(),
      (() => {
        const _el$39 = _$createElement("span");
        _$insertNode(_el$39, _$createTextNode(`3`));
        return _el$39;
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
