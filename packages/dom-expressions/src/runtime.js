import { dynamicProperty } from "./utils";
import core from "rxcore";
const { root, effect, memo, ignore, currentContext } = core;

export const config = {};
export { root, effect, memo, currentContext };

export function createComponent(Comp, props, dynamicKeys) {
  if (dynamicKeys) {
    for (let i = 0; i < dynamicKeys.length; i++) dynamicProperty(props, dynamicKeys[i]);
  }
  return ignore(() => Comp(props));
}

export function getHydrationKey() {
  return config.hydrate.id;
}

export function setHydrateContext(context) {
  config.hydrate = context;
}

export function nextHydrateContext() {
  return config.hydrate
    ? {
        id: `${config.hydrate.id}.${config.hydrate.count++}`,
        count: 0,
        registry: config.hydrate.registry
      }
    : undefined;
}