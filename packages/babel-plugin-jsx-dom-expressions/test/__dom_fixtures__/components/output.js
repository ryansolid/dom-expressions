import { template as _$template } from "r-dom";
import { wrapMemo as _$wrapMemo } from "r-dom";
import { For as _$For } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { insert as _$insert } from "r-dom";

const _tmpl$ = _$template(`<div>Hello </div>`, 2),
  _tmpl$2 = _$template(`<div></div>`, 2),
  _tmpl$3 = _$template(`<div>From Parent</div>`, 2);

const _ck$ = ["children"],
  _ck$2 = ["dynamic", "hyphen-ated"],
  _ck$3 = ["children", "dynamic"],
  _ck$4 = ["each", "fallback"];

const Child = props => [
  (() => {
    const _el$ = _tmpl$.cloneNode(true),
      _el$2 = _el$.firstChild;

    props.ref && props.ref(_el$);

    _$insert(_el$, () => props.name, null);

    return _el$;
  })(),
  (() => {
    const _el$3 = _tmpl$2.cloneNode(true);

    _$insert(_el$3, () => props.children);

    return _el$3;
  })()
];

const template = props => {
  let childRef;
  const { content } = props;
  return (function() {
    const _el$4 = _tmpl$2.cloneNode(true);

    _$insert(
      _el$4,
      _$createComponent(
        Child,
        Object.assign(
          {
            name: "John"
          },
          Object.keys(props).reduce((m$, k$) => ((m$[k$] = () => props[k$]), m$), {}),
          {
            ref: r$ => (childRef = r$),
            booleanProperty: true,
            children: () => _tmpl$3.cloneNode(true)
          }
        ),
        ["children", ...Object.keys(props)]
      ),
      null
    );

    _$insert(
      _el$4,
      _$createComponent(
        Child,
        {
          name: "Jason",
          ref: props.ref,
          children: () => {
            const _el$6 = _tmpl$2.cloneNode(true);

            _$insert(_el$6, content);

            return _el$6;
          }
        },
        _ck$
      ),
      null
    );

    _$insert(
      _el$4,
      _$createComponent(Context.Consumer, {
        children: context => context
      }),
      null
    );

    return _el$4;
  })();
};

const template2 = _$createComponent(
  Child,
  {
    name: "Jake",
    dynamic: () => state.data,
    stale: state.data,
    handleClick: clickHandler,
    "hyphen-ated": () => state.data
  },
  _ck$2
);

const template3 = _$createComponent(
  Child,
  {
    children: () => [
      _tmpl$2.cloneNode(true),
      _tmpl$2.cloneNode(true),
      _tmpl$2.cloneNode(true),
      "After"
    ]
  },
  _ck$
);

const template4 = _$createComponent(
  Child,
  {
    children: () => _tmpl$2.cloneNode(true)
  },
  _ck$
);

const template5 = _$createComponent(
  Child,
  {
    dynamic: () => state.dynamic,
    children: () => state.dynamic
  },
  _ck$3
); // builtIns

const template6 = _$createComponent(
  _$For,
  {
    each: () => state.list,
    fallback: () => _$createComponent(Loading, {}),
    children: item => item
  },
  _ck$4
);

const template7 = _$createComponent(
  Child,
  {
    children: () => [_tmpl$2.cloneNode(true), _$wrapMemo(() => state.dynamic)]
  },
  _ck$
);

const template8 = _$createComponent(
  Child,
  {
    children: () => [item => item, item => item]
  },
  _ck$
);

const template9 = _$createComponent(_garbage, {
  children: "Hi"
});
