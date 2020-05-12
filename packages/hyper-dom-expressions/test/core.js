import S, { root, value, sample } from "s-js";

const currentContext = null;

function memo(fn, equal) {
  if (typeof fn !== "function") return fn;
  if (!equal) return S(fn);
  const s = value(sample(fn));
  S(() => s(fn()));
  return s;
}

function createComponent(Comp, props, dynamicKeys) {
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
  return c;
}

function dynamicProperty(props, key) {
  const src = props[key];
  Object.defineProperty(props, key, {
    get() {
      return src();
    },
    enumerable: true
  });
}

export { root, S as effect, memo, createComponent, currentContext };
