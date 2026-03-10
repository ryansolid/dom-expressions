import { untrack, getOwner, createOwner, runWithOwner, getNextChildId } from "@solidjs/signals";

export const sharedConfig = {
  getNextContextId() {
    const owner = getOwner();
    return owner ? getNextChildId(owner) : undefined;
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
    const o = createOwner();
    return fn.map(f => runWithOwner.bind(null, o, f));
  }
  return runWithOwner.bind(null, createOwner(), fn);
}

import { createRoot, createRenderEffect, createMemo, merge, flatten } from "@solidjs/signals";

export { createRoot as root, getOwner, untrack, runWithOwner, merge as mergeProps, flatten } from "@solidjs/signals";

export const effect = (fn, effectFn, initial) =>
  createRenderEffect(fn, effectFn, initial, { transparent: true });

export const memo = (fn, transparent) =>
  transparent
    ? fn.$r ? fn : createMemo(() => fn(), undefined, { transparent: true })
    : createMemo(() => fn());
