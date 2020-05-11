import S, { root, value, sample } from "s-js";

export default {
  ignore: sample,
  root,
  effect: S,
  memo: (fn, equal) => {
    if (typeof fn !== "function") return fn;
    if (!equal) return S(fn);
    const s = value(sample(fn));
    S(() => s(fn()));
    return s;
  }
};
