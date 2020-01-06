export const sharedConfig = {};
export function setHydrateContext(context) {
  sharedConfig.hydrate = context;
}
export function nextHydrateContext() {
  return sharedConfig.hydrate
    ? {
        id: `${sharedConfig.hydrate.id}.${sharedConfig.hydrate.count++}`,
        count: 0,
        registry: sharedConfig.hydrate.registry
      }
    : undefined;
}
