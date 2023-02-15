import { For as _$For } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { mergeProps as _$mergeProps } from "r-server";
import { ssr as _$ssr } from "r-server";
import { escape as _$escape } from "r-server";
import { ssrHydrationKey as _$ssrHydrationKey } from "r-server";
const _tmpl$ = ["<div", ">Hello <!--#-->", "<!--/--></div>"],
  _tmpl$2 = ["<div", ">", "</div>"],
  _tmpl$3 = ["<div", ">From Parent</div>"],
  _tmpl$4 = ["<div", "><!--#-->", "<!--/--><!--#-->", "<!--/--><!--#-->", "<!--/--></div>"],
  _tmpl$5 = ["<div", "></div>"],
  _tmpl$6 = [
    "<div",
    "><!--#-->",
    "<!--/--> | <!--#-->",
    "<!--/--> | <!--#-->",
    "<!--/--> | <!--#-->",
    "<!--/--> | <!--#-->",
    "<!--/--> | <!--#-->",
    "<!--/--></div>"
  ],
  _tmpl$7 = [
    "<div",
    "><!--#-->",
    "<!--/--> | <!--#-->",
    "<!--/--><!--#-->",
    "<!--/--> | <!--#-->",
    "<!--/--><!--#-->",
    "<!--/--> | <!--#-->",
    "<!--/--></div>"
  ],
  _tmpl$8 = ["<div", "> | <!--#-->", "<!--/--> |  |  | <!--#-->", "<!--/--> | </div>"],
  _tmpl$9 = ["<span", ">1</span>"],
  _tmpl$10 = ["<span", ">2</span>"],
  _tmpl$11 = ["<span", ">3</span>"];
import { Show } from "somewhere";
const Child = props => {
  const [s, set] = createSignal();
  return [
    _$ssr(_tmpl$, _$ssrHydrationKey(), _$escape(props.name)),
    _$ssr(_tmpl$2, _$ssrHydrationKey(), _$escape(props.children))
  ];
};
const template = props => {
  let childRef;
  const { content } = props;
  return _$ssr(
    _tmpl$4,
    _$ssrHydrationKey(),
    _$escape(
      _$createComponent(
        Child,
        _$mergeProps(
          {
            name: "John"
          },
          props,
          {
            booleanProperty: true,
            get children() {
              return _$ssr(_tmpl$3, _$ssrHydrationKey());
            }
          }
        )
      )
    ),
    _$escape(
      _$createComponent(
        Child,
        _$mergeProps(
          {
            name: "Jason"
          },
          dynamicSpread,
          {
            get children() {
              return _$ssr(_tmpl$2, _$ssrHydrationKey(), _$escape(content));
            }
          }
        )
      )
    ),
    _$escape(
      _$createComponent(Context.Consumer, {
        children: context => context
      })
    )
  );
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
  }
});
const template3 = _$createComponent(Child, {
  get children() {
    return [
      _$ssr(_tmpl$5, _$ssrHydrationKey()),
      _$ssr(_tmpl$5, _$ssrHydrationKey()),
      _$ssr(_tmpl$5, _$ssrHydrationKey()),
      "After"
    ];
  }
});
const [s, set] = createSignal();
const template4 = _$createComponent(Child, {
  get children() {
    return _$ssr(_tmpl$5, _$ssrHydrationKey());
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
    return [_$ssr(_tmpl$5, _$ssrHydrationKey()), state.dynamic];
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
const template10 = _$ssr(
  _tmpl$6,
  _$ssrHydrationKey(),
  _$escape(
    _$createComponent(Link, {
      children: "new"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "comments"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "show"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "ask"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "jobs"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "submit"
    })
  )
);
const template11 = _$ssr(
  _tmpl$7,
  _$ssrHydrationKey(),
  _$escape(
    _$createComponent(Link, {
      children: "new"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "comments"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "show"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "ask"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "jobs"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "submit"
    })
  )
);
const template12 = _$ssr(
  _tmpl$8,
  _$ssrHydrationKey(),
  _$escape(
    _$createComponent(Link, {
      children: "comments"
    })
  ),
  _$escape(
    _$createComponent(Link, {
      children: "show"
    })
  )
);
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
      _$ssr(_tmpl$9, _$ssrHydrationKey()),
      " ",
      _$ssr(_tmpl$10, _$ssrHydrationKey()),
      " ",
      _$ssr(_tmpl$11, _$ssrHydrationKey())
    ];
  }
});
const Template18 = _$createComponent(Pre, {
  get children() {
    return [
      _$ssr(_tmpl$9, _$ssrHydrationKey()),
      _$ssr(_tmpl$10, _$ssrHydrationKey()),
      _$ssr(_tmpl$11, _$ssrHydrationKey())
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
    return state.dynamic;
  }
});
const template25 = _$createComponent(Component, {
  get children() {
    return _$ssr(_tmpl$5, _$ssrHydrationKey());
  }
});
