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

// Client asset reveal gate (docs/client-css-reveal-gating.md): reading an
// unsettled asset promise throws the core's NotReadyError so tracked
// contexts (transitions, boundary reveals) hold and retry when it settles;
// no-op once settled. Implemented over the core's async-source machinery —
// one async node per promise, shared across readers. The node must be
// created OUTSIDE the calling compute (`runWithOwner(null)`): waitAsset is
// called from compute phases, and anything owned by the computing node is
// disposed when it re-runs — the gate would die with the retry it triggers.
const assetGates = new Map();
export function waitAsset(promise) {
  let gate = assetGates.get(promise);
  if (!gate) {
    runWithOwner(null, () => {
      gate = createMemo(() => promise);
    });
    assetGates.set(promise, gate);
  }
  gate();
}

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

// DR-2 value tier, document face (mirrors solid's rxcore, which wraps the
// value in a full async-aware memo): the read throws not-ready until the
// promise settles, then reads as the settled value. The frame sink pre-taps
// iterables down to a promise of their first yield, so this only sees
// thenables. Not-ready rides the test core's `_promise` convention
// (ssrHandleError above), which the engine's hole machinery re-pulls on.
export function ssrAsyncValue(value) {
  let settled = false;
  let errored = false;
  let result;
  const promise = Promise.resolve(value).then(
    v => {
      settled = true;
      result = v;
    },
    e => {
      settled = true;
      errored = true;
      result = e;
    }
  );
  return () => {
    if (!settled) {
      const err = new Error("async value not ready");
      err._promise = promise;
      throw err;
    }
    if (errored) throw result;
    return result;
  };
}
