import { untrack, getOwner, runWithOwner, getNextChildId } from "@solidjs/signals";

export const sharedConfig = {
  getNextContextId() {
    const owner = getOwner();
    return owner ? getNextChildId(owner) : undefined;
  }
};

export function ssrHandleError(err) {
  if (err && err._promise) return err._promise;
}

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
  const owner = getOwner();
  if (!owner) return fn;
  return Array.isArray(fn)
    ? fn.map(f => () => runWithOwner(owner, f))
    : () => runWithOwner(owner, fn);
}

import { createRoot, createRenderEffect, createMemo, merge, flatten } from "@solidjs/signals";

export {
  createRoot as root,
  getOwner,
  untrack,
  runWithOwner,
  merge as mergeProps,
  flatten
} from "@solidjs/signals";

export const effect = (fn, effectFn, options) =>
  createRenderEffect(
    fn,
    effectFn,
    options ? { transparent: true, ...options } : { transparent: true }
  );

export const memo = (fn, transparent) =>
  transparent
    ? fn.$r
      ? fn
      : createMemo(() => fn(), { transparent: true })
    : createMemo(() => fn());
