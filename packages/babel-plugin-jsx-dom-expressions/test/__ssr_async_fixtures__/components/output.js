import { For as _$For } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { ssrAsync as _$ssrAsync } from "r-dom";
import { escape as _$escape } from "r-dom";
const _ck$ = ["children"],
  _ck$2 = ["dynamic", "hyphen-ated"],
  _ck$3 = ["children", "dynamic"],
  _ck$4 = ["each", "fallback"];

const Child = props => [
  _$ssrAsync(["<div>Hello ", "</div>"], () => _$escape(props.name)),
  _$ssrAsync(["<div>", "</div>"], () => _$escape(props.children))
];

const template = props => {
  let childRef;
  const { content } = props;
  return _$ssrAsync(
    ["<div>", "", "", "</div>"],
    _$createComponent(
      Child,
      Object.assign(
        {
          name: "John"
        },
        Object.keys(props).reduce((m$, k$) => ((m$[k$] = () => props[k$]), m$), {}),
        {
          booleanProperty: true,
          children: () => _$ssrAsync("<div>From Parent</div>")
        }
      ),
      ["children", ...Object.keys(props)]
    ),
    _$createComponent(
      Child,
      {
        name: "Jason",
        children: () => _$ssrAsync(["<div>", "</div>"], _$escape(content))
      },
      _ck$
    ),
    _$createComponent(Context.Consumer, {
      children: context => context
    })
  );
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
      _$ssrAsync("<div></div>"),
      _$ssrAsync("<div></div>"),
      _$ssrAsync("<div></div>"),
      "After"
    ]
  },
  _ck$
);

const template4 = _$createComponent(
  Child,
  {
    children: () => _$ssrAsync("<div></div>")
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
    children: () => [_$ssrAsync("<div></div>"), () => state.dynamic]
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

const template10 = _$ssrAsync(
  ["<div>", " | ", " | ", " | ", " | ", " | ", "</div>"],
  _$createComponent(Link, {
    children: "new"
  }),
  _$createComponent(Link, {
    children: "comments"
  }),
  _$createComponent(Link, {
    children: "show"
  }),
  _$createComponent(Link, {
    children: "ask"
  }),
  _$createComponent(Link, {
    children: "jobs"
  }),
  _$createComponent(Link, {
    children: "submit"
  })
);

const template11 = _$ssrAsync(
  ["<div>", " | ", "", " | ", "", " | ", "</div>"],
  _$createComponent(Link, {
    children: "new"
  }),
  _$createComponent(Link, {
    children: "comments"
  }),
  _$createComponent(Link, {
    children: "show"
  }),
  _$createComponent(Link, {
    children: "ask"
  }),
  _$createComponent(Link, {
    children: "jobs"
  }),
  _$createComponent(Link, {
    children: "submit"
  })
);

const template12 = _$ssrAsync(
  ["<div> | ", " |  |  | ", " | </div>"],
  _$createComponent(Link, {
    children: "comments"
  }),
  _$createComponent(Link, {
    children: "show"
  })
);
