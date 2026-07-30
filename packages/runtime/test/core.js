import {
  createRoot,
  createRenderEffect,
  createMemo,
  merge,
  flatten,
  untrack,
  getOwner,
  runWithOwner,
  getNextChildId,
  createOwner,
  createContext,
  getContext,
  setContext
} from "@solidjs/signals";

export { createRoot as root, getOwner, untrack, runWithOwner, merge as mergeProps, flatten };

// Hydration-zone flag (mirrors solid's NoHydrateContext): under NoHydration,
// ids keep flowing (owners consume normally) but keys stop EMITTING.
const NoHydrateContext = createContext(false);

export const sharedConfig = {
  getNextContextId() {
    const owner = getOwner();
    if (!owner) return undefined;
    if (getContext(NoHydrateContext, owner)) return undefined;
    return getNextChildId(owner);
  }
};

// Faithful mimics of solid's server components (see solid
// packages/solid/src/server/hydration.ts) — the frame sink renders
// server-owned output under NoHydration and re-enters client positions
// through Hydration.
export function NoHydration(props) {
  return runWithOwner(createOwner(), () => {
    setContext(NoHydrateContext, true);
    return props.children;
  });
}

export function Hydration(props) {
  if (!getContext(NoHydrateContext)) return props.children;
  return runWithOwner(createOwner({ id: props.id ?? "" }), () => {
    setContext(NoHydrateContext, false);
    return props.children;
  });
}

// Context barrier for server-component render roots. The real
// implementation (solid's runInServerComponentScope) rebuilds the scope
// owner's context record so user context never crosses a server component —
// that requires the core's own owner internals, so like runWithHydrationScope
// the test core passes through; barrier semantics are covered against the
// real core (solid-web's server suite).
export function runInServerComponentScope(fn) {
  return fn();
}

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
