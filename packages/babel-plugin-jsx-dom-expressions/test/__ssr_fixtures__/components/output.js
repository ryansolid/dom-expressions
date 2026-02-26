import { memo as _$memo } from "r-server";
import { For as _$For } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { mergeProps as _$mergeProps } from "r-server";
import { applyRef as _$applyRef } from "r-server";
import { ssr as _$ssr } from "r-server";
import { ssrRunInScope as _$ssrRunInScope } from "r-server";
import { escape as _$escape } from "r-server";
var _tmpl$ = ["<div>Hello ", "</div>"],
  _tmpl$2 = ["<div>", "</div>"],
  _tmpl$3 = "<div>From Parent</div>",
  _tmpl$4 = ["<div>", "", "", "</div>"],
  _tmpl$5 = "<div></div>",
  _tmpl$6 = ["<div>", " | ", " | ", " | ", " | ", " | ", "</div>"],
  _tmpl$7 = ["<div>", " | ", "", " | ", "", " | ", "</div>"],
  _tmpl$8 = ["<div> | ", " |  |  | ", " | </div>"],
  _tmpl$9 = "<span>1</span>",
  _tmpl$10 = "<span>2</span>",
  _tmpl$11 = "<span>3</span>";
import { Show, binding } from "somewhere";
function refFn() {}
const refConst = null;
const Child = props => {
  const [s, set] = createSignal();
  return [
    (() => {
      var _ref$ = props.ref,
        _v$ = _$ssrRunInScope(() => _$escape(props.name));
      return _$ssr(_tmpl$, _v$);
    })(),
    (() => {
      var _ref$2 = set,
        _v$2 = _$ssrRunInScope(() => _$escape(props.children));
      return _$ssr(_tmpl$2, _v$2);
    })()
  ];
};
const template = props => {
  let childRef;
  const { content } = props;
  return (() => {
    var _v$3 = _$escape(
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
                return _$ssr(_tmpl$3);
              }
            }
          )
        )
      ),
      _v$5 = _$escape(
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
                var _v$4 = _$escape(content);
                return _$ssr(_tmpl$2, _v$4);
              }
            }
          )
        )
      ),
      _v$6 = (() => {
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
    return _$ssr(_tmpl$4, _v$3, _v$5, _v$6);
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
    return [_$ssr(_tmpl$5), _$ssr(_tmpl$5), _$ssr(_tmpl$5), "After"];
  }
});
const [s, set] = createSignal();
const template4 = _$createComponent(Child, {
  ref: set,
  get children() {
    return _$ssr(_tmpl$5);
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
    return [_$ssr(_tmpl$5), _$memo(() => state.dynamic)];
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
  var _v$7 = _$escape(
      _$createComponent(Link, {
        children: "new"
      })
    ),
    _v$8 = _$escape(
      _$createComponent(Link, {
        children: "comments"
      })
    ),
    _v$9 = _$escape(
      _$createComponent(Link, {
        children: "show"
      })
    ),
    _v$10 = _$escape(
      _$createComponent(Link, {
        children: "ask"
      })
    ),
    _v$11 = _$escape(
      _$createComponent(Link, {
        children: "jobs"
      })
    ),
    _v$12 = _$escape(
      _$createComponent(Link, {
        children: "submit"
      })
    );
  return _$ssr(_tmpl$6, _v$7, _v$8, _v$9, _v$10, _v$11, _v$12);
})();
const template11 = (() => {
  var _v$13 = _$escape(
      _$createComponent(Link, {
        children: "new"
      })
    ),
    _v$14 = _$escape(
      _$createComponent(Link, {
        children: "comments"
      })
    ),
    _v$15 = _$escape(
      _$createComponent(Link, {
        children: "show"
      })
    ),
    _v$16 = _$escape(
      _$createComponent(Link, {
        children: "ask"
      })
    ),
    _v$17 = _$escape(
      _$createComponent(Link, {
        children: "jobs"
      })
    ),
    _v$18 = _$escape(
      _$createComponent(Link, {
        children: "submit"
      })
    );
  return _$ssr(_tmpl$7, _v$13, _v$14, _v$15, _v$16, _v$17, _v$18);
})();
const template12 = (() => {
  var _v$19 = _$escape(
      _$createComponent(Link, {
        children: "comments"
      })
    ),
    _v$20 = _$escape(
      _$createComponent(Link, {
        children: "show"
      })
    );
  return _$ssr(_tmpl$8, _v$19, _v$20);
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
    return [_$ssr(_tmpl$9), " ", _$ssr(_tmpl$10), " ", _$ssr(_tmpl$11)];
  }
});
const Template18 = _$createComponent(Pre, {
  get children() {
    return [_$ssr(_tmpl$9), _$ssr(_tmpl$10), _$ssr(_tmpl$11)];
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
    return _$ssr(_tmpl$5);
  }
});
const template26 = [
  _$createComponent(Component, {
    get when() {
      const foo = test();
      if ("t" in foo) {
        return foo;
      }
    }
  }),
  _$createComponent(Component, {
    get when() {
      return ((val = 123) => {
        return val * 2;
      })();
    }
  })
];
const template27 = _$createComponent(Component, {
  get when() {
    return prop.red ? "red" : "green";
  }
});
class Template28 {
  render() {
    const _self$2 = this;
    return _$createComponent(Component, {
      get when() {
        const foo = _self$2.value;
        if ("key" in foo) {
          return foo;
        }
      }
    });
  }
}
class Template29 extends ParentComponent {
  constructor() {
    super();
    const _self$3 = this;
    _$createComponent(this.component, {
      get method() {
        return _self$3.method;
      }
    });
  }
  get get() {
    const _self$4 = this;
    _$createComponent(this.component, {
      get method() {
        return _self$4.method;
      }
    });
  }
  set set(v) {
    const _self$5 = this;
    _$createComponent(this.component, {
      get method() {
        return _self$5.method;
      }
    });
  }
  method() {
    const _self$6 = this;
    _$createComponent(this.component, {
      get method() {
        return _self$6.method;
      }
    });
  }
  field = (() => {
    const _self$7 = this;
    return _$createComponent(this.component, {
      get method() {
        return _self$7.method;
      },
      get comp() {
        return _$createComponent(_self$7.another, {});
      }
    });
  })();
  fieldArrow = () => {
    const _self$8 = this;
    return _$createComponent(this.component, {
      get method() {
        return _self$8.method;
      }
    });
  };
  fieldFunction = function () {
    const _self$9 = this;
    _$createComponent(this.component, {
      get method() {
        return _self$9.method;
      }
    });
  };
}
const template30 = _$createComponent(Comp, {
  ref: binding
});
const template31 = _$createComponent(Comp, {
  ref(r$) {
    var _ref$6 = binding.prop;
    typeof _ref$6 === "function" || Array.isArray(_ref$6)
      ? _$applyRef(_ref$6, r$)
      : (binding.prop = r$);
  }
});
const template32 = _$createComponent(Comp, {
  ref(r$) {
    var _ref$7 = refFn;
    typeof _ref$7 === "function" || Array.isArray(_ref$7) ? _$applyRef(_ref$7, r$) : (refFn = r$);
  }
});
const template33 = _$createComponent(Comp, {
  ref: refConst
});
const template34 = _$createComponent(Comp, {
  ref(r$) {
    var _ref$8 = refUnknown;
    typeof _ref$8 === "function" || Array.isArray(_ref$8)
      ? _$applyRef(_ref$8, r$)
      : (refUnknown = r$);
  }
});
