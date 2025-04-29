import { untrack } from "@solidjs/signals";

export const sharedConfig = {};

export function createComponent(Comp, props) {
  if (Comp.prototype && Comp.prototype.isClassComponent) {
    return untrack(() => {
      const comp = new Comp(props);
      return comp.render(props);
    });
  }
  return untrack(() => Comp(props));
}

export {
  createRoot as root,
  createRenderEffect as effect,
  createMemo as memo,
  getOwner,
  untrack,
  merge as mergeProps,
  flatten
} from "@solidjs/signals";
