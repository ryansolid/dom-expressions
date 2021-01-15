export function dynamicProperty(props, key) {
  const src = props[key];
  Object.defineProperty(props, key, {
    get() {
      return src();
    },
    enumerable: true
  });
  return props;
}

export function assignProps(target, ...sources) {
  for (let i = 0; i < sources.length; i++) {
    const descriptors = Object.getOwnPropertyDescriptors(sources[i]);
    Object.defineProperties(target, descriptors);
  }
  return target;
}

export function getHydrationKey() {
  const hydrate = globalThis._$HYDRATION.context;
  return `${hydrate.id}${hydrate.count++}`
}