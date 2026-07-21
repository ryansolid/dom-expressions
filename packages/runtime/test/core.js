import {
  createRoot,
  createRenderEffect,
  createMemo,
  merge,
  flatten,
  untrack,
  getOwner,
  runWithOwner,
  getNextChildId
} from "@solidjs/signals";

export { createRoot as root, getOwner, untrack, runWithOwner, merge as mergeProps, flatten };

export const sharedConfig = {
  getNextContextId() {
    const owner = getOwner();
    return owner ? getNextChildId(owner) : undefined;
  }
};

export function ssrHandleError(err) {
  if (err && err._promise) return err._promise;
}

// Hole id scope (mirrors the framework impl): reserve one id slot at
// registration, evaluate with the reserved id + zeroed child counter so
// deferred/retried holes can't shift sibling ids.
export function ssrScope(fn) {
  const owner = getOwner();
  if (!owner || owner.id == null) return fn;
  const scopeId = getNextChildId(owner);
  return () => {
    const prevId = owner.id;
    const prevCount = owner._childCount;
    owner.id = scopeId;
    owner._childCount = 0;
    try {
      let v = fn();
      while (typeof v === "function") v = v();
      return v;
    } finally {
      owner.id = prevId;
      owner._childCount = prevCount;
    }
  };
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

export const effect = (fn, effectFn, options) =>
  createRenderEffect(
    fn,
    effectFn,
    options ? { ...options, transparent: !options.scope } : { transparent: true }
  );

export const memo = (fn, transparent) =>
  transparent
    ? fn.$r
      ? fn
      : createMemo(() => fn(), { transparent: true })
    : createMemo(() => fn());

// Hydration-key owner scoping (solid-web's rxcore implements this over
// createOwner({ id })). The test core has no hydration id chain, so the
// scope is a passthrough — document-mode tests assert markers, not keys.
export const runWithHydrationScope = (id, fn) => fn();
