import { JSX } from "./jsx.js";
export const DOMWithState: Record<string, Record<string, 1 | 2>>;
export const ChildProperties: Set<string>;
export const DelegatedEvents: Set<string>;
export const DOMElements: Set<string>;
export const SVGElements: Set<string>;
export const MathMLElements: Set<string>;
export const VoidElements: Set<string>;
export const RawTextElements: Set<string>;
export const Namespaces: Record<string, string>;

type MountableElement = Element | Document | ShadowRoot | DocumentFragment | Node;
export function render(
  code: () => JSX.Element,
  element: MountableElement,
  init?: JSX.Element,
  options?: { owner?: unknown }
): () => void;
/**
 * @param flag
 * - `undefined` — clone the template as-is (uses `cloneNode`).
 * - `1` — use `document.importNode` instead of `cloneNode`.
 * - `2` — the template html is wrapped; the outer tag is stripped at clone time.
 */
export function template(html: string, flag?: 1 | 2): () => Element;
export function scope<T extends () => any>(fn: T): T;
export function effect<T>(fn: (prev?: T) => T, effect: (value: T, prev?: T) => void): void;
export function memo<T>(fn: () => T, equal: boolean): () => T;
export function untrack<T>(fn: () => T): T;
export function insert<T>(
  parent: MountableElement,
  accessor: (() => T) | T,
  marker?: Node | null,
  init?: JSX.Element,
  options?: {
    /**
     * Live accessor for the slot's logical host in the source tree (portals).
     * Each top-level node the slot manages is tagged with a `_$host` getter
     * backed by this accessor so delegated events retarget correctly.
     */
    host?: () => Node | null;
    /** Defer the insert effect to the queue instead of running it inline. */
    schedule?: boolean;
  }
): JSX.Element;
export function createComponent<T>(Comp: (props: T) => JSX.Element, props: T): JSX.Element;
export function delegateEvents(eventNames: string[]): void;
export function registerDelegatedRoot(root: MountableElement): void;
export function unregisterDelegatedRoot(root: MountableElement): void;
export function registerDelegatedContainer(
  container: MountableElement,
  owner?: MountableElement
): void;
export function unregisterDelegatedContainer(
  container: MountableElement,
  owner?: MountableElement
): void;
export function getDelegatedRoot(node: MountableElement): MountableElement | undefined;
export function spread<T>(node: Element, accessor: T, skipChildren?: Boolean): void;
export function assign(
  node: Element,
  props: any,
  skipChildren?: Boolean,
  prevProps?: any,
  skipRef?: Boolean
): void;
export function setAttribute(node: Element, name: string, value: string): void;
export function setAttributeNS(node: Element, namespace: string, name: string, value: string): void;
/**
 * Register a consumer for compiler-emitted element claims. Compiled DOM
 * output claims navigation-relevant elements (`a[href]`, `form[action]`) at
 * creation, and compiler-owned writes to `href`/`action` re-invoke the same
 * handlers — so handlers must be idempotent and must check the element's
 * relevance themselves (rechecks can fire for any element whose
 * `href`/`action` is written, e.g. `<link href>`). Handlers run under the
 * reactive owner current at element creation; scope per-element state and
 * cleanup through your own reactive system. Dormant until registered —
 * without a handler the emitted claims are null checks. Returns an
 * unregister function.
 */
export function registerElementClaim(handler: (element: Element) => void): () => void;
/**
 * Claim `node` for registered consumers (see `registerElementClaim`).
 * Emitted by the compiler at element creation; idempotent by contract.
 */
export function claimElement<T extends Element>(node: T): T;
/**
 * Sweep-claim every navigation-relevant element (`a[href]`, `form[action]`)
 * in `root` — the subtree equivalent of the per-element `claimElement`
 * compiled output emits, for content that becomes live DOM without compiled
 * creation code (frame streams, adopted SSR ranges). Dormant without a
 * registered consumer.
 */
export function claimElementTree<T extends Node>(root: T): T;
export function className(node: Element, value: JSX.ClassValue, prev?: JSX.ClassValue): void;
export function setProperty(node: Element, name: string, value: any): void;
export function setStyleProperty(node: Element, name: string, value: any): void;
export function addEvent(
  node: Element,
  name: string,
  handler: EventListener | EventListenerObject | (EventListenerObject & AddEventListenerOptions),
  delegate: boolean
): void;
export function style(
  node: Element,
  value: { [k: string]: string },
  prev?: { [k: string]: string }
): void;
export function getOwner(): unknown;
export function mergeProps(...sources: unknown[]): unknown;
export function dynamicProperty(props: unknown, key: string): unknown;
export function applyRef<T extends Element = Element>(
  r: ((element: NoInfer<T>) => void) | ((element: NoInfer<T>) => void)[],
  element: T
): void;
export function ref(
  fn: () => ((element: Element) => void) | ((element: Element) => void)[],
  element: Element
): void;

export function hydrate(
  fn: () => JSX.Element,
  node: MountableElement,
  options?: { renderId?: string; owner?: unknown }
): () => void;
export function getHydrationKey(): string | undefined;
export function getNextElement(template?: () => Element): Element;
export function getNextMatch(start: Node, elementName: string): Element;
export function getNextMarker(start: Node): [Node, Array<Node>];
/** @deprecated Use `useHead` — removed before `0.50.0` stable. */
export function useAssets(fn: () => JSX.Element): void;
/** @deprecated Use `useHead` — removed before `0.50.0` stable. */
export function getAssets(): string;
/**
 * A head tag descriptor. Props values may be getters (reactive on the
 * client); `children` is the text body. `key` overrides the built-in dedupe
 * identity (`title` is a hard singleton that `key` cannot fork).
 */
export type HeadTag = {
  tag: "title" | "meta" | "link" | "style" | "script" | "base";
  props: Record<string, any>;
  key?: string | (() => string);
};
/**
 * Registers head tags with the ambient head registry under the current
 * owner. An array is a group — one replacement set. Resolution is
 * last-committed group per identity; disposal restores the previous winner.
 * During hydration the server-flushed head state stays authoritative until
 * hydration completes. See docs/head-management-rfc.md.
 */
export function useHead(tag: HeadTag | HeadTag[]): void;
export type AssetDescriptor =
  | { type: "style"; href: string; attrs?: Record<string, string> }
  | { type: "inline-style"; id: string; content?: string; attrs?: Record<string, string> }
  | { type: "module"; href: string }
  | ExclusiveAssetDescriptor<any>;
export interface ExclusiveAssetDescriptor<T> {
  policy: "exclusive";
  key: string;
  value: T;
  get(): T;
  set(value: T): void;
}
export function acquireAsset(descriptor: AssetDescriptor): () => void;
export function HydrationScript(props?: { nonce?: string; eventNames?: string[] }): JSX.Element;
export function generateHydrationScript(options?: {
  nonce?: string;
  eventNames?: string[];
}): string;
export function Assets(props: { children?: JSX.Element }): JSX.Element;
/**
 * See the server entry's `ResponseStub` — the shape of the mutable response
 * head integrations expose as `event.response` via module augmentation.
 */
export interface ResponseStub {
  status?: number;
  statusText?: string;
  headers: Headers;
  /**
   * Set by the integration once the response head has been derived/sent
   * from this stub (status/headers can no longer change); consumers must
   * treat later writes and cleanup-time retractions as no-ops.
   */
  committed?: boolean;
}
export interface RequestEvent {
  request: Request;
  locals: Record<string | number | symbol, any>;
}
export declare const RequestContext: unique symbol;
export function getRequestEvent(): RequestEvent | undefined;
export function runHydrationEvents(): void;
