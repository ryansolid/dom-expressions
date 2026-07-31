import { JSX } from "./jsx.js";
import { SerializerPlugin } from "./serializer.js";
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

/** Static asset manifest produced by a build (e.g. parsed Vite manifest.json). */
export type AssetManifest = Record<
  string,
  { file: string; css?: string[]; isEntry?: boolean; imports?: string[] }
> & { _base?: string };

/** Inline style content, e.g. dev CSS collected from a bundler's module graph. */
export type InlineStyleAsset = {
  id: string;
  content: string;
  attrs?: Record<string, string>;
};

export type ResolvedAssets = {
  js: string[];
  css: (string | InlineStyleAsset)[];
};

/**
 * Resolver form of the manifest option — the primitive a dev server
 * implements against its live module graph (a static manifest object is
 * normalized into a sync resolver internally). `resolve` may return a
 * promise (async resolvers require streaming rendering); CSS entries may be
 * URL strings (emitted as load-gated `<link>` tags) or inline-style
 * descriptors (emitted as `<style>` tags). A bare `resolve`-shaped function
 * is accepted as shorthand for `{ resolve }`.
 */
export type AssetResolver = {
  resolve(
    key: string
  ): ResolvedAssets | null | undefined | Promise<ResolvedAssets | null | undefined>;
  /**
   * Synchronous fast path answering with whatever is knowable without async
   * work (typically js URLs, omitting css). Sync consumers — e.g. a lazy
   * component's `moduleUrl` getter used by islands — use this when `resolve`
   * would return a promise, so adapters should provide it whenever possible.
   */
  resolveSync?(key: string): ResolvedAssets | null | undefined;
};

/** Bare-function shorthand for `AssetResolver` (no sync fast path). */
export type AssetResolverFn = (
  key: string
) => ResolvedAssets | null | undefined | Promise<ResolvedAssets | null | undefined>;

export function renderToString<T>(
  fn: () => T,
  options?: {
    nonce?: string;
    renderId?: string;
    noScripts?: boolean;
    plugins?: SerializerPlugin[];
    manifest?: AssetManifest | AssetResolver | AssetResolverFn;
    onError?: (err: any) => void;
  }
): string;
/** @deprecated use renderToStream which also returns a promise */
export function renderToStringAsync<T>(
  fn: () => T,
  options?: {
    timeoutMs?: number;
    nonce?: string;
    renderId?: string;
    noScripts?: boolean;
    plugins?: SerializerPlugin[];
    manifest?: AssetManifest | AssetResolver | AssetResolverFn;
    onError?: (err: any) => void;
  }
): Promise<string>;
export function renderToStream<T>(
  fn: () => T,
  options?: {
    nonce?: string;
    renderId?: string;
    noScripts?: boolean;
    plugins?: SerializerPlugin[];
    manifest?: AssetManifest | AssetResolver | AssetResolverFn;
    onCompleteShell?: (info: { write: (v: string) => void }) => void;
    onCompleteAll?: (info: { write: (v: string) => void }) => void;
    onError?: (err: any) => void;
  }
): {
  then: (fn: (html: string) => void) => void;
  pipe: (writable: { write: (v: string) => void; end: () => void }) => void;
  pipeTo: (writable: WritableStream) => Promise<void>;
  /**
   * Lazy `ReadableStream<Uint8Array>` view of the render — hand it straight
   * to `new Response(stream.readable)`. First access starts the render
   * piping through an internal `TransformStream` (chunks are UTF-8 encoded
   * bytes, the same as `pipeTo` writes) and the stream is cached, so
   * repeated access returns the same instance. Like `pipe`/`pipeTo`, this
   * consumes the render: use exactly one of the three — mixing distinct
   * consumers (`readable` after `pipe`/`pipeTo`, or vice versa) throws an
   * error naming the conflict.
   */
  readonly readable: ReadableStream<Uint8Array>;
};

export function HydrationScript(props: { nonce?: string; eventNames?: string[] }): JSX.Element;
export function ssr(template: string[] | string, ...nodes: any[]): { t: string };
export function ssrElement(
  name: string,
  props: any,
  children: any,
  needsId: boolean
): { t: string };
export function ssrClassName(value: string | { [k: string]: boolean } | Array<any>): string;
export function ssrStyle(value: string | { [k: string]: string }): string;
export function ssrStyleProperty(name: string, value: any): string;
export function ssrAttribute(key: string, value: any): string;
export function ssrGroup<T extends () => any[]>(fn: T, n: number): T;
export function scope<T>(fn: () => T): () => unknown;
export function ssrHydrationKey(): string;
export function resolveSSRNode(node: any, result?: any, top?: boolean): any;
export function escape(s: any, attr?: boolean): any;
export function applyRef(
  r: ((element: any) => void) | ((element: any) => void)[],
  element: any
): void;
/** @deprecated Use `useHead` — removed before `0.50.0` stable. */
export function useAssets(fn: () => JSX.Element): void;
/** @deprecated Use `useHead` — removed before `0.50.0` stable. */
export function getAssets(): string;
/**
 * A head tag descriptor. Props values may be getters (evaluated lazily on
 * the server — at the owning flush boundary — and reactively on the client);
 * `children` is the text body (title text, inline style/script content).
 * `key` overrides the built-in dedupe identity (`title` is a hard singleton
 * that `key` cannot fork).
 */
export type HeadTag = {
  tag: "title" | "meta" | "link" | "style" | "script" | "base";
  props: Record<string, any>;
  key?: string | (() => string);
};
/**
 * Registers head tags with the render's head registry. An array is a group —
 * one replacement set; a single tag is a group of one. Replaceable tags
 * (title/meta/canonical/…) resolve by last-committed group and stream as
 * patches with their suspense boundary's reveal; resource tags (preload and
 * friends, stylesheets, `script[src]`) emit eagerly and dedupe by identity.
 * See docs/head-management-rfc.md.
 */
export function useHead(tag: HeadTag | HeadTag[]): void;
export function getHydrationKey(): string | undefined;
export function effect<T>(fn: (prev?: T) => T, effect: (value: T, prev?: T) => void): void;
export function memo<T>(fn: () => T, equal: boolean): () => T;
export function createComponent<T>(Comp: (props: T) => JSX.Element, props: T): JSX.Element;
export function mergeProps(...sources: unknown[]): unknown;
export function getOwner(): unknown;
export function generateHydrationScript(options?: {
  nonce?: string;
  eventNames?: string[];
}): string;
/**
 * Registered symbol (`Symbol.for("solid.RequestContext")`) naming the
 * global slot where `provideRequestEvent` parks the AsyncLocalStorage that
 * scopes request events. Integration plumbing — application code reads the
 * event through `getRequestEvent()` instead.
 * @internal
 */
export declare const RequestContext: unique symbol;
/**
 * The mutable response head an integration's handler exposes on the request
 * event as `event.response`: status/statusText/headers it will apply when
 * sending the response. A scaffold, not a `Response` — application code
 * (e.g. JSX response components) writes to it during render, and the
 * handler reads it when the head goes out. Core does not declare the
 * `response` property on `RequestEvent` itself: integrations that provide
 * one declare it through module augmentation (as `@solidjs/router` does),
 * and this type names the shape they agree on. Core's server-function
 * handler reads its `Set-Cookie` headers when folding single-flight
 * cookies but never requires it.
 */
export interface ResponseStub {
  status?: number;
  statusText?: string;
  headers: Headers;
  /**
   * Set by the integration once the response head has been derived/sent
   * from this stub — status and headers can no longer change. Consumers
   * that write response metadata during render (e.g. JSX response
   * components) must treat later status/header writes and cleanup-time
   * retractions as no-ops.
   */
  committed?: boolean;
}

/**
 * The per-request context available on the server: the incoming `Request`
 * and a `locals` bag integrations and middleware can hang state on.
 * Frameworks typically extend this shape with richer fields (e.g. a
 * `response` head — see `ResponseStub`).
 */
export interface RequestEvent {
  request: Request;
  locals: Record<string | number | symbol, any>;
}
/**
 * The current request event, when called on the server inside a request
 * scope (established by `provideRequestEvent` from `@solidjs/web/storage`
 * or by the framework). Undefined on the client and outside a request.
 * Read it above `await` boundaries in partially-polyfilled environments.
 */
export function getRequestEvent(): RequestEvent | undefined;

export function Assets(props: { children?: JSX.Element }): JSX.Element;
export function untrack<T>(fn: () => T): T;

// client-only APIs

/** @deprecated not supported on the server side */
export function style(
  node: Element,
  value: { [k: string]: string },
  prev?: { [k: string]: string }
): void;

/** @deprecated not supported on the server side */
export function insert<T>(
  parent: MountableElement,
  accessor: (() => T) | T,
  marker?: Node | null,
  init?: JSX.Element
): JSX.Element;

/** @deprecated not supported on the server side */
export function spread<T>(node: Element, accessor: T, skipChildren?: Boolean): void;

/** @deprecated not supported on the server side */
export function delegateEvents(eventNames: string[]): void;
/** @deprecated not supported on the server side */
export function registerDelegatedRoot(root: MountableElement): void;
/** @deprecated not supported on the server side */
export function unregisterDelegatedRoot(root: MountableElement): void;
/** @deprecated not supported on the server side */
export function registerDelegatedContainer(
  container: MountableElement,
  owner?: MountableElement
): void;
/** @deprecated not supported on the server side */
export function unregisterDelegatedContainer(
  container: MountableElement,
  owner?: MountableElement
): void;
/** @deprecated not supported on the server side */
export function getDelegatedRoot(node: MountableElement): MountableElement | undefined;
/** @deprecated not supported on the server side */
export function dynamicProperty(props: unknown, key: string): unknown;
/** @deprecated not supported on the server side */
export function setAttribute(node: Element, name: string, value: string): void;
/** @deprecated not supported on the server side */
export function setAttributeNS(node: Element, namespace: string, name: string, value: string): void;

/**
 * Server no-op: element claims are a client-only concern, but consumers may
 * register isomorphically. Returns a no-op unregister function.
 */
export function registerElementClaim(handler: (element: Element) => void): () => void;
/** Server no-op: returns `node` unchanged. Claims never fire during SSR. */
export function claimElement<T extends Element>(node: T): T;
/** Server no-op: returns `root` unchanged. Claims never fire during SSR. */
export function claimElementTree<T extends Node>(root: T): T;

/** @deprecated not supported on the server side */
export function addEvent(node: Element, name: string, handler: () => void, delegate: boolean): void;

/** @deprecated not supported on the server side */
export function render(code: () => JSX.Element, element: MountableElement): () => void;
/**
 * @deprecated not supported on the server side
 * @param flag
 * - `undefined` — clone the template as-is (uses `cloneNode`).
 * - `1` — use `document.importNode` instead of `cloneNode`.
 * - `2` — the template html is wrapped; the outer tag is stripped at clone time.
 */
export function template(html: string, flag?: 1 | 2): () => Element;
/** @deprecated not supported on the server side */
export function setProperty(node: Element, name: string, value: any): void;
/** @deprecated not supported on the server side */
export function className(node: Element, value: string): void;
/** @deprecated not supported on the server side */
export function assign(node: Element, props: any, skipChildren?: Boolean): void;

/** @deprecated not supported on the server side */
export function hydrate(
  fn: () => JSX.Element,
  node: MountableElement,
  options?: { renderId?: string; owner?: unknown }
): () => void;

/** @deprecated not supported on the server side */
export function getNextElement(template?: () => Element): Element;
/** @deprecated not supported on the server side */
export function getNextMatch(start: Node, elementName: string): Element;
/** @deprecated not supported on the server side */
export function getNextMarker(start: Node): [Node, Array<Node>];
/** @deprecated not supported on the server side */
export function runHydrationEvents(): void;
/** @deprecated not supported on the server side */
export function ref(
  fn: () => ((element: Element) => void) | ((element: Element) => void)[],
  element: Element
): void;
/** @deprecated not supported on the server side */
export function setStyleProperty(node: Element, name: string, value: any): void;
/** @deprecated not supported on the server side — register assets through the render context instead */
export function acquireAsset(descriptor: unknown): () => void;
