import { template as _$template } from "r-dom";
import { memo as _$memo } from "r-dom";
import { For as _$For } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { mergeProps as _$mergeProps } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { getNextMarker as _$getNextMarker } from "r-dom";
import { insert as _$insert } from "r-dom";
import { use as _$use } from "r-dom";
const _tmpl$ = /*#__PURE__*/ _$template(`<div>Hello <!#><!/>`),
  _tmpl$2 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<div>From Parent`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<div><!#><!/><!#><!/><!#><!/>`),
  _tmpl$5 = /*#__PURE__*/ _$template(
    `<div><!#><!/> | <!#><!/> | <!#><!/> | <!#><!/> | <!#><!/> | <!#><!/>`
  ),
  _tmpl$6 = /*#__PURE__*/ _$template(
    `<div><!#><!/> | <!#><!/><!#><!/> | <!#><!/><!#><!/> | <!#><!/>`
  ),
  _tmpl$7 = /*#__PURE__*/ _$template(`<div> | <!#><!/> |  |  | <!#><!/> | `),
  _tmpl$8 = /*#__PURE__*/ _$template(`<span>1`),
  _tmpl$9 = /*#__PURE__*/ _$template(`<span>2`),
  _tmpl$10 = /*#__PURE__*/ _$template(`<span>3`);
import { Show } from "somewhere";
const Child = props => {
  const [s, set] = createSignal();
  return [
    (() => {
      const _el$ = _$getNextElement(_tmpl$),
        _el$2 = _el$.firstChild,
        _el$3 = _el$2.nextSibling,
        [_el$4, _co$] = _$getNextMarker(_el$3.nextSibling);
      const _ref$ = props.ref;
      typeof _ref$ === "function" ? _$use(_ref$, _el$) : (props.ref = _el$);
      _$insert(_el$, () => props.name, _el$4, _co$);
      return _el$;
    })(),
    (() => {
      const _el$5 = _$getNextElement(_tmpl$2);
      _$use(set, _el$5);
      _$insert(_el$5, () => props.children);
      return _el$5;
    })()
  ];
};
const template = props => {
  let childRef;
  const { content } = props;
  return (() => {
    const _el$6 = _$getNextElement(_tmpl$4),
      _el$9 = _el$6.firstChild,
      [_el$10, _co$2] = _$getNextMarker(_el$9.nextSibling),
      _el$11 = _el$10.nextSibling,
      [_el$12, _co$3] = _$getNextMarker(_el$11.nextSibling),
      _el$13 = _el$12.nextSibling,
      [_el$14, _co$4] = _$getNextMarker(_el$13.nextSibling);
    _$insert(
      _el$6,
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
              return _$getNextElement(_tmpl$3);
            }
          }
        )
      ),
      _el$10,
      _co$2
    );
    _$insert(
      _el$6,
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
              const _el$8 = _$getNextElement(_tmpl$2);
              _$insert(_el$8, content);
              return _el$8;
            }
          }
        )
      ),
      _el$12,
      _co$3
    );
    _$insert(
      _el$6,
      _$createComponent(Context.Consumer, {
        ref(r$) {
          const _ref$4 = props.consumerRef();
          typeof _ref$4 === "function" && _ref$4(r$);
        },
        children: context => context
      }),
      _el$14,
      _co$4
    );
    return _el$6;
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
      _$getNextElement(_tmpl$2),
      _$getNextElement(_tmpl$2),
      _$getNextElement(_tmpl$2),
      "After"
    ];
  }
});
const [s, set] = createSignal();
const template4 = _$createComponent(Child, {
  ref: set,
  get children() {
    return _$getNextElement(_tmpl$2);
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
    return [_$getNextElement(_tmpl$2), _$memo(() => state.dynamic)];
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
  const _el$20 = _$getNextElement(_tmpl$5),
    _el$26 = _el$20.firstChild,
    [_el$27, _co$5] = _$getNextMarker(_el$26.nextSibling),
    _el$21 = _el$27.nextSibling,
    _el$28 = _el$21.nextSibling,
    [_el$29, _co$6] = _$getNextMarker(_el$28.nextSibling),
    _el$22 = _el$29.nextSibling,
    _el$30 = _el$22.nextSibling,
    [_el$31, _co$7] = _$getNextMarker(_el$30.nextSibling),
    _el$23 = _el$31.nextSibling,
    _el$32 = _el$23.nextSibling,
    [_el$33, _co$8] = _$getNextMarker(_el$32.nextSibling),
    _el$24 = _el$33.nextSibling,
    _el$34 = _el$24.nextSibling,
    [_el$35, _co$9] = _$getNextMarker(_el$34.nextSibling),
    _el$25 = _el$35.nextSibling,
    _el$36 = _el$25.nextSibling,
    [_el$37, _co$10] = _$getNextMarker(_el$36.nextSibling);
  _$insert(
    _el$20,
    _$createComponent(Link, {
      children: "new"
    }),
    _el$27,
    _co$5
  );
  _$insert(
    _el$20,
    _$createComponent(Link, {
      children: "comments"
    }),
    _el$29,
    _co$6
  );
  _$insert(
    _el$20,
    _$createComponent(Link, {
      children: "show"
    }),
    _el$31,
    _co$7
  );
  _$insert(
    _el$20,
    _$createComponent(Link, {
      children: "ask"
    }),
    _el$33,
    _co$8
  );
  _$insert(
    _el$20,
    _$createComponent(Link, {
      children: "jobs"
    }),
    _el$35,
    _co$9
  );
  _$insert(
    _el$20,
    _$createComponent(Link, {
      children: "submit"
    }),
    _el$37,
    _co$10
  );
  return _el$20;
})();
const template11 = (() => {
  const _el$38 = _$getNextElement(_tmpl$6),
    _el$42 = _el$38.firstChild,
    [_el$43, _co$11] = _$getNextMarker(_el$42.nextSibling),
    _el$39 = _el$43.nextSibling,
    _el$44 = _el$39.nextSibling,
    [_el$45, _co$12] = _$getNextMarker(_el$44.nextSibling),
    _el$46 = _el$45.nextSibling,
    [_el$47, _co$13] = _$getNextMarker(_el$46.nextSibling),
    _el$40 = _el$47.nextSibling,
    _el$48 = _el$40.nextSibling,
    [_el$49, _co$14] = _$getNextMarker(_el$48.nextSibling),
    _el$50 = _el$49.nextSibling,
    [_el$51, _co$15] = _$getNextMarker(_el$50.nextSibling),
    _el$41 = _el$51.nextSibling,
    _el$52 = _el$41.nextSibling,
    [_el$53, _co$16] = _$getNextMarker(_el$52.nextSibling);
  _$insert(
    _el$38,
    _$createComponent(Link, {
      children: "new"
    }),
    _el$43,
    _co$11
  );
  _$insert(
    _el$38,
    _$createComponent(Link, {
      children: "comments"
    }),
    _el$45,
    _co$12
  );
  _$insert(
    _el$38,
    _$createComponent(Link, {
      children: "show"
    }),
    _el$47,
    _co$13
  );
  _$insert(
    _el$38,
    _$createComponent(Link, {
      children: "ask"
    }),
    _el$49,
    _co$14
  );
  _$insert(
    _el$38,
    _$createComponent(Link, {
      children: "jobs"
    }),
    _el$51,
    _co$15
  );
  _$insert(
    _el$38,
    _$createComponent(Link, {
      children: "submit"
    }),
    _el$53,
    _co$16
  );
  return _el$38;
})();
const template12 = (() => {
  const _el$54 = _$getNextElement(_tmpl$7),
    _el$55 = _el$54.firstChild,
    _el$60 = _el$55.nextSibling,
    [_el$61, _co$17] = _$getNextMarker(_el$60.nextSibling),
    _el$56 = _el$61.nextSibling,
    _el$62 = _el$56.nextSibling,
    [_el$63, _co$18] = _$getNextMarker(_el$62.nextSibling),
    _el$59 = _el$63.nextSibling;
  _$insert(
    _el$54,
    _$createComponent(Link, {
      children: "comments"
    }),
    _el$61,
    _co$17
  );
  _$insert(
    _el$54,
    _$createComponent(Link, {
      children: "show"
    }),
    _el$63,
    _co$18
  );
  return _el$54;
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
      _$getNextElement(_tmpl$8),
      " ",
      _$getNextElement(_tmpl$9),
      " ",
      _$getNextElement(_tmpl$10)
    ];
  }
});
const Template18 = _$createComponent(Pre, {
  get children() {
    return [_$getNextElement(_tmpl$8), _$getNextElement(_tmpl$9), _$getNextElement(_tmpl$10)];
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
    return _$getNextElement(_tmpl$2);
  }
});
