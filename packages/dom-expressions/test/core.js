import { untrack, getOwner, Owner } from "@solidjs/signals";

export const sharedConfig = {
  getNextContextId() {
    return getOwner()?.getNextChildId();
  }
};

export function createComponent(Comp, props) {
  if (Comp.prototype && Comp.prototype.isClassComponent) {
    return untrack(() => {
      const comp = new Comp(props);
      return comp.render(props);
    });
  }
  return untrack(() => Comp(props));
}

export function ssrRunInScope(fn) {
  if (Array.isArray(fn)) {
    const o = new Owner();
    return fn.map(f => runWithOwner.bind(null, o, f));
  }
  return runWithOwner.bind(null, new Owner(), fn);
}

export { createRoot as root, createRenderEffect as effect, createMemo as memo, getOwner, untrack, merge as mergeProps, flatten } from "@solidjs/signals";
