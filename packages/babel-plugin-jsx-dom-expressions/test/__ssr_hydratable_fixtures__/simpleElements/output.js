import { ssr as _$ssr } from "r-server";
import { getHydrationKey as _$getHydrationKey } from "r-server";
const _tmpl$ = [
  '<div data-hk="',
  '" id="main"><style>div { color: red; }</style><h1>Welcome</h1><label for="entry">Edit:</label><input id="entry" type="text"></div>'
];

const template = _$ssr(_tmpl$, _$getHydrationKey());
