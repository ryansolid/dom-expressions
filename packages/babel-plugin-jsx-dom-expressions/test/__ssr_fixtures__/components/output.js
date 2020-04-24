import { For as _$For } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { ssr as _$ssr } from "r-dom";
const _ck$ = ["children"],
  _ck$2 = ["dynamic", "hyphen-ated"],
  _ck$3 = ["children", "dynamic"],
  _ck$4 = ["each", "fallback"];

const Child = props => [
  _$ssr`<div>Hello ${() => props.name}</div>`,
  _$ssr`<div>${() => props.children}</div>`
];

const template = props => {
  let childRef;
  const { content } = props;
  return _$ssr`<div>${_$createComponent(
    Child,
    Object.assign(
      {
        name: "John"
      },
      Object.keys(props).reduce((m$, k$) => ((m$[k$] = () => props[k$]), m$), {}),
      {
        ref: r$ => (childRef = r$),
        booleanProperty: true,
        children: () => "<div>From Parent</div>"
      }
    ),
    ["children", ...Object.keys(props)]
  )}${_$createComponent(
    Child,
    {
      name: "Jason",
      ref: props.ref,
      children: () => _$ssr`<div>${content}</div>`
    },
    _ck$
  )}${_$createComponent(Context.Consumer, {
    children: context => context
  })}</div>`;
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
    children: () => ["<div></div>", "<div></div>", "<div></div>", "After"]
  },
  _ck$
);

const template4 = _$createComponent(
  Child,
  {
    children: () => "<div></div>"
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
    children: () => ["<div></div>", () => state.dynamic]
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
