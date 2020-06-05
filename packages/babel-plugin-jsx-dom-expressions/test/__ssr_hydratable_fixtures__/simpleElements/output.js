import { ssr as _$ssr } from "r-dom";
import { getHydrationKey as _$getHydrationKey } from "r-dom";

const template = _$ssr(
  [
    '<div _hk="',
    '" id="main"><style>div { color: red; }</style><h1>Welcome</h1><label for="entry">Edit:</label><input id="entry" type="text"></div>'
  ],
  _$getHydrationKey()
);
