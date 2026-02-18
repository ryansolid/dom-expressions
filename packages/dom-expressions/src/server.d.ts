import { JSX } from "./jsx.js";
export const Properties: Set<string>;
export const ChildProperties: Set<string>;
export const DelegatedEvents: Set<string>;
export const DOMElements: Set<string>;
export const SVGElements: Set<string>;
export const SVGNamespace: Record<string, string>;

type MountableElement = Element | Document | ShadowRoot | DocumentFragment | Node;

export function renderToString<T>(
  fn: () => T,
  options?: {
    nonce?: string;
    renderId?: string;
    noScripts?: boolean;
    plugins?: any[];
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
    plugins?: any[];
    onError?: (err: any) => void;
  }
): Promise<string>;
export function renderToStream<T>(
  fn: () => T,
  options?: {
    nonce?: string;
    renderId?: string;
    noScripts?: boolean;
    plugins?: any[];
    onCompleteShell?: (info: { write: (v: string) => void }) => void;
    onCompleteAll?: (info: { write: (v: string) => void }) => void;
    onError?: (err: any) => void;
  }
): {
  then: (fn: (html: string) => void) => void;
  pipe: (writable: { write: (v: string) => void; end: () => void }) => void;
  pipeTo: (writable: WritableStream) => Promise<void>;
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
export function ssrHydrationKey(): string;
export function resolveSSRNode(node: any, result?: any, top?: boolean): any;
export function escape(s: any, attr?: boolean): any;
export function useAssets(fn: () => JSX.Element): void;
export function getAssets(): string;
export function getHydrationKey(): string | undefined;
export function effect<T>(fn: (prev?: T) => T, effect: (value: T, prev?: T) => void, init?: T): void;
export function memo<T>(fn: () => T, equal: boolean): () => T;
export function createComponent<T>(Comp: (props: T) => JSX.Element, props: T): JSX.Element;
export function mergeProps(...sources: unknown[]): unknown;
export function getOwner(): unknown;
export function ssrRunInScope(fn: () => void, owner: unknown): void;
export function generateHydrationScript(options?: { nonce?: string; eventNames?: string[] }): string;
export declare const RequestContext: unique symbol;
export interface RequestEvent {
  request: Request;
  locals: Record<string | number | symbol, any>;
}
export function getRequestEvent(): RequestEvent | undefined;

export function Hydration(props: { children?: JSX.Element }): JSX.Element;
export function NoHydration(props: { children?: JSX.Element }): JSX.Element;
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
export function spread<T>(
  node: Element,
  accessor: T,
  isSVG?: Boolean,
  skipChildren?: Boolean
): void;

/** @deprecated not supported on the server side */
export function delegateEvents(eventNames: string[], d?: Document): void;
/** @deprecated not supported on the server side */
export function dynamicProperty(props: unknown, key: string): unknown;
/** @deprecated not supported on the server side */
export function setAttribute(node: Element, name: string, value: string): void;
/** @deprecated not supported on the server side */
export function setAttributeNS(node: Element, namespace: string, name: string, value: string): void;

/** @deprecated not supported on the server side */
export function addEventListener(
  node: Element,
  name: string,
  handler: () => void,
  delegate: boolean
): void;

/** @deprecated not supported on the server side */
export function render(code: () => JSX.Element, element: MountableElement): () => void;
/** @deprecated not supported on the server side */
export function template(html: string, isImportNode?: boolean, isSVG?: boolean, isMathML?: boolean): () => Element;
/** @deprecated not supported on the server side */
export function setProperty(node: Element, name: string, value: any): void;
/** @deprecated not supported on the server side */
export function className(node: Element, value: string): void;
/** @deprecated not supported on the server side */
export function assign(node: Element, props: any, isSVG?: Boolean, skipChildren?: Boolean): void;

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
