import S, { value, sample } from "s-js";

export default {
  effect: S,
  memo: (fn, equal) => {
    if (!equal) return S(fn);
    const s = value(sample(fn));
    S(() => s(fn()));
    return s;
  },
  ignore: sample
};
