import { template as _$template } from "r-dom";
import { wrapMemo as _$wrapMemo } from "r-dom";
import { For as _$For } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { insert as _$insert } from "r-dom";

const _tmpl$ = _$template(`<div>Hello <!--#--><!--/--></div>`, 4),
  _tmpl$2 = _$template(`<div></div>`, 2),
  _tmpl$3 = _$template(`<div>From Parent</div>`, 2),
  _tmpl$4 = _$template(`<div><!--#--><!--/--><!--#--><!--/--><!--#--><!--/--></div>`, 8);

const _ck$ = ["children"],
  _ck$2 = ["dynamic", "hyphen-ated"],
  _ck$3 = ["children", "dynamic"],
  _ck$4 = ["each", "fallback"];

const Child = props => [
  (() => {
    const _el$ = _$getNextElement(_tmpl$, true),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.nextSibling,
      _el$4 = _el$3.nextSibling;

    props.ref && props.ref(_el$);

    _$insert(_el$, () => props.name, _el$4);

    return _el$;
  })(),
  (() => {
    const _el$5 = _$getNextElement(_tmpl$2, true);

    _$insert(_el$5, () => props.children);

    return _el$5;
  })()
];

const template = props => {
  let childRef;
  const { content } = props;
  return (function() {
    const _el$6 = _$getNextElement(_tmpl$4, true),
      _el$9 = _el$6.firstChild,
      _el$10 = _el$9.nextSibling,
      _el$11 = _el$10.nextSibling,
      _el$12 = _el$11.nextSibling,
      _el$13 = _el$12.nextSibling,
      _el$14 = _el$13.nextSibling;

    _$insert(
      _el$6,
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
            children: () => _$getNextElement(_tmpl$3, true)
          }
        ),
        ["children", ...Object.keys(props)]
      ),
      _el$10
    );

    _$insert(
      _el$6,
      _$createComponent(
        Child,
        {
          name: "Jason",
          ref: props.ref,
          children: () => {
            const _el$8 = _$getNextElement(_tmpl$2, true);

            _$insert(_el$8, content);

            return _el$8;
          }
        },
        _ck$
      ),
      _el$12
    );

    _$insert(
      _el$6,
      _$createComponent(Context.Consumer, {
        children: context => context
      }),
      _el$14
    );

    return _el$6;
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
      _$getNextElement(_tmpl$2, true),
      _$getNextElement(_tmpl$2, true),
      _$getNextElement(_tmpl$2, true),
      "After"
    ]
  },
  _ck$
);

const template4 = _$createComponent(
  Child,
  {
    children: () => _$getNextElement(_tmpl$2, true)
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
    children: () => [_$getNextElement(_tmpl$2, true), _$wrapMemo(() => state.dynamic)]
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
