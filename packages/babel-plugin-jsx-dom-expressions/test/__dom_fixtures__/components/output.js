import { template as _$template } from "r-dom";
import { memo as _$memo } from "r-dom";
import { For as _$For } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { mergeProps as _$mergeProps } from "r-dom";
import { insert as _$insert } from "r-dom";
import { use as _$use } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<div>Hello `),
  _tmpl$2 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<div>From Parent`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<div> | <!> | <!> | <!> | <!> | `),
  _tmpl$5 = /*#__PURE__*/ _$template(`<div> | <!> | <!> | `),
  _tmpl$6 = /*#__PURE__*/ _$template(`<div> | <!> |  |  | <!> | `),
  _tmpl$7 = /*#__PURE__*/ _$template(`<span>1`),
  _tmpl$8 = /*#__PURE__*/ _$template(`<span>2`),
  _tmpl$9 = /*#__PURE__*/ _$template(`<span>3`);
import { Show } from "somewhere";
const Child = props => {
  const [s, set] = createSignal();
  return [
    (() => {
      var _el$ = _tmpl$(),
        _el$2 = _el$.firstChild;
      var _ref$ = props.ref;
      typeof _ref$ === "function" ? _$use(_ref$, _el$) : (props.ref = _el$);
      _$insert(_el$, () => props.name, null);
      return _el$;
    })(),
    (() => {
      var _el$3 = _tmpl$2();
      _$use(set, _el$3);
      _$insert(_el$3, () => props.children);
      return _el$3;
    })()
  ];
};
const template = props => {
  let childRef;
  const { content } = props;
  return (() => {
    var _el$4 = _tmpl$2();
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
              var _ref$2 = childRef;
              typeof _ref$2 === "function" ? _ref$2(r$) : (childRef = r$);
            },
            booleanProperty: true,
            get children() {
              return _tmpl$3();
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
              var _ref$3 = props.ref;
              typeof _ref$3 === "function" ? _ref$3(r$) : (props.ref = r$);
            },
            get children() {
              var _el$6 = _tmpl$2();
              _$insert(_el$6, content);
              return _el$6;
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
          var _ref$4 = props.consumerRef();
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
    return [_tmpl$2(), _tmpl$2(), _tmpl$2(), "After"];
  }
});
const [s, set] = createSignal();
const template4 = _$createComponent(Child, {
  ref: set,
  get children() {
    return _tmpl$2();
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
    return [_tmpl$2(), _$memo(() => state.dynamic)];
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
  var _el$12 = _tmpl$4(),
    _el$13 = _el$12.firstChild,
    _el$18 = _el$13.nextSibling,
    _el$14 = _el$18.nextSibling,
    _el$19 = _el$14.nextSibling,
    _el$15 = _el$19.nextSibling,
    _el$20 = _el$15.nextSibling,
    _el$16 = _el$20.nextSibling,
    _el$21 = _el$16.nextSibling,
    _el$17 = _el$21.nextSibling;
  _$insert(
    _el$12,
    _$createComponent(Link, {
      children: "new"
    }),
    _el$13
  );
  _$insert(
    _el$12,
    _$createComponent(Link, {
      children: "comments"
    }),
    _el$18
  );
  _$insert(
    _el$12,
    _$createComponent(Link, {
      children: "show"
    }),
    _el$19
  );
  _$insert(
    _el$12,
    _$createComponent(Link, {
      children: "ask"
    }),
    _el$20
  );
  _$insert(
    _el$12,
    _$createComponent(Link, {
      children: "jobs"
    }),
    _el$21
  );
  _$insert(
    _el$12,
    _$createComponent(Link, {
      children: "submit"
    }),
    null
  );
  return _el$12;
})();
const template11 = (() => {
  var _el$22 = _tmpl$5(),
    _el$23 = _el$22.firstChild,
    _el$26 = _el$23.nextSibling,
    _el$24 = _el$26.nextSibling,
    _el$27 = _el$24.nextSibling,
    _el$25 = _el$27.nextSibling;
  _$insert(
    _el$22,
    _$createComponent(Link, {
      children: "new"
    }),
    _el$23
  );
  _$insert(
    _el$22,
    _$createComponent(Link, {
      children: "comments"
    }),
    _el$26
  );
  _$insert(
    _el$22,
    _$createComponent(Link, {
      children: "show"
    }),
    _el$26
  );
  _$insert(
    _el$22,
    _$createComponent(Link, {
      children: "ask"
    }),
    _el$27
  );
  _$insert(
    _el$22,
    _$createComponent(Link, {
      children: "jobs"
    }),
    _el$27
  );
  _$insert(
    _el$22,
    _$createComponent(Link, {
      children: "submit"
    }),
    null
  );
  return _el$22;
})();
const template12 = (() => {
  var _el$28 = _tmpl$6(),
    _el$29 = _el$28.firstChild,
    _el$34 = _el$29.nextSibling,
    _el$30 = _el$34.nextSibling,
    _el$35 = _el$30.nextSibling,
    _el$33 = _el$35.nextSibling;
  _$insert(
    _el$28,
    _$createComponent(Link, {
      children: "comments"
    }),
    _el$34
  );
  _$insert(
    _el$28,
    _$createComponent(Link, {
      children: "show"
    }),
    _el$35
  );
  return _el$28;
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
    return [_tmpl$7(), " ", _tmpl$8(), " ", _tmpl$9()];
  }
});
const Template18 = _$createComponent(Pre, {
  get children() {
    return [_tmpl$7(), _tmpl$8(), _tmpl$9()];
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
    return _tmpl$2();
  }
});
const template26 = _$createComponent(Component, {
  get when() {
    const foo = test();
    if ("t" in foo) {
      return foo;
    }
  }
});
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
