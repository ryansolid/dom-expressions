import S, { root, value, sample } from "s-js";

const getOwner = null;
const sharedConfig = {};

function effect(track, effect, init) {
  S(p => {
    const v = track(p);
    sample(() => effect(v, p));
    return v;
  }, init);
}

function memo(fn) {
  const s = value(sample(fn));
  S(() => s(fn()));
  return s;
}

function createComponent(Comp, props) {
  if (Comp.prototype && Comp.prototype.isClassComponent) {
    return sample(() => {
      const comp = new Comp(props);
      return comp.render(props);
    });
  }
  return sample(() => Comp(props));
}

const propTraps = {
  get(_, property) {
    return _.get(property);
  },
  has(_, property) {
    return _.has(property);
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property);
      },
      set: trueFn,
      deleteProperty: trueFn
    };
  },
  ownKeys(_) {
    return _.keys();
  }
};

function trueFn() {
  return true;
}

function resolveSource(s) {
  return (s = typeof s === "function" ? s() : s) == null ? {} : s;
}

function mergeProps(...sources) {
  return new Proxy(
    {
      get(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          const v = resolveSource(sources[i])[property];
          if (v !== undefined) return v;
        }
      },
      has(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          if (property in resolveSource(sources[i])) return true;
        }
        return false;
      },
      keys() {
        const keys = [];
        for (let i = 0; i < sources.length; i++)
          keys.push(...Object.keys(resolveSource(sources[i])));
        return [...new Set(keys)];
      }
    },
    propTraps
  );
}

export { root, effect, memo, createComponent, getOwner, sharedConfig, sample as untrack, mergeProps };
