export function renderToString<T>(
  fn: () => T,
  options?: {
    nonce?: string;
    renderId?: string;
  }
): string;
export function renderToStringAsync<T>(
  fn: () => T,
  options?: {
    timeoutMs?: number;
    nonce?: string;
    renderId?: string;
  }
): Promise<string>;
export function renderToStream<T>(
  fn: () => T,
  options?: {
    nonce?: string;
    dataOnly?: boolean;
    renderId?: string;
    onCompleteShell?: () => void;
    onCompleteAll?: () => void;
  }
): {
  pipe: (writable: { write: (v: string) => void }) => void;
  pipeTo: (writable: WritableStream) => void;
};

export function Assets(props: { children?: JSX.Element }): JSX.Element;
export function HydrationScript(props: { nonce?: string; eventNames?: string[] }): JSX.Element;
export function NoHydration(props: { children?: JSX.Element }): JSX.Element;
export function ssr(template: string[] | string, ...nodes: any[]): { t: string };
export function resolveSSRNode(node: any): string;
export function ssrClassList(value: { [k: string]: boolean }): string;
export function ssrStyle(value: { [k: string]: string }): string;
export function ssrSpread(accessor: any): () => string;
export function ssrBoolean(key: string, value: boolean): string;
export function ssrHydrationKey(): string;
export function escape(html: string): string;
export function getHydrationKey(): string;
export function effect<T>(fn: (prev?: T) => T, init?: T): void;
export function memo<T>(fn: () => T, equal: boolean): () => T;
export function createComponent<T>(Comp: (props: T) => JSX.Element, props: T): JSX.Element;
export function mergeProps(...sources: unknown[]): unknown;
export function getOwner(): unknown;
export function generateHydrationScript(options: { nonce?: string; eventNames?: string[] }): string;

// deprecated
export type LegacyResults = {
  startWriting: () => void;
};
export function pipeToWritable<T>(
  fn: () => T,
  writable: WritableStream,
  options?: {
    nonce?: string;
    dataOnly?: boolean;
    onReady?: (res: LegacyResults) => void;
    onCompleteAll?: () => void;
  }
): void;
export function pipeToNodeWritable<T>(
  fn: () => T,
  writable: { write: (v: string) => void },
  options?: {
    nonce?: string;
    dataOnly?: boolean;
    onReady?: (res: LegacyResults) => void;
    onCompleteAll?: () => void;
  }
): void;
