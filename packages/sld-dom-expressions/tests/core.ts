import { untrack } from "@solidjs/signals";

export const sharedConfig = {};

export function createComponent(Comp: any, props: any) {
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
  runWithOwner,
  untrack,
  merge as mergeProps,
  flatten,
  flush
} from "@solidjs/signals";

export const RawTextElements = new Set([
  "style",
  "script",
  "noscript",
  "template",
  "textarea",
  "title",
]);

export const VoidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);