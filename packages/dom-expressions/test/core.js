import S, { value, sample } from "s-js";
import { sharedConfig } from "./hydrate.config";
import { dynamicProp } from "../src/utils";

export default {
  config: sharedConfig,
  createComponent(Comp, props, dynamicKeys) {
    if (dynamicKeys) {
      for (let i = 0; i < dynamicKeys.length; i++) dynamicProp(props, dynamicKeys[i]);
    }

    if (Comp.prototype && Comp.prototype.isClassComponent) {
      return sample(() => {
        const comp = new Comp(props);
        return comp.render(props);
      });
    }

    return sample(() => Comp(props));
  },
  effect: S,
  memo: (fn, equal) => {
    if (!equal) return S(fn);
    const s = value(sample(fn));
    S(() => s(fn()));
    return s;
  }
};
