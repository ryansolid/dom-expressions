import S, { sample } from "s-js";
import { dynamicProperty } from "../src/utils";
export * from "../src/dom";

export function createComponent(Comp, props, dynamicKeys) {
  if (dynamicKeys) {
    for (let i = 0; i < dynamicKeys.length; i++) dynamicProperty(props, dynamicKeys[i]);
  }

  let c;
  if (Comp.prototype && Comp.prototype.isClassComponent) {
    c = sample(() => {
      const comp = new Comp(props);
      return comp.render(props);
    });
  } else c = sample(() => Comp(props));
  return typeof c === "function" ? S(c) : c;
}
