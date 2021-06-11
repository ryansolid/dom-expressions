export type RenderToStringResults = {
  html: string;
  script: string;
};

export type PipeToWritableResults = {
  write: (v: string) => void;
  abort: () => void;
  script: string;
}

export function renderToString<T>(
  fn: () => T,
  options?: {
    eventNames?: string[];
    nonce?: string;
    noScript?: boolean;
  }
): RenderToStringResults;
export function renderToStringAsync<T>(
  fn: () => T,
  options?: {
    eventNames?: string[];
    timeoutMs?: number;
    nonce?: string;
    noScript?: boolean;
  }
): Promise<RenderToStringResults>;
export function pipeToNodeWritable<T>(
  fn: () => T,
  writable: { write: (v: string) => void },
  options?: {
    eventNames?: string[];
    nonce?: string;
    noScript?: boolean;
    onReady?: (r: PipeToWritableResults) => void;
    onComplete?: (r: PipeToWritableResults) => void | Promise<void>;
  }
): void;

export function pipeToWritable<T>(
  fn: () => T,
  writable: WritableStream,
  options?: {
    eventNames?: string[];
    nonce?: string;
    noScript?: boolean;
    onReady?: (r: PipeToWritableResults) => void;
    onComplete?: (r: PipeToWritableResults) => void | Promise<void>;
  }
): void;
export function ssr(template: string[] | string, ...nodes: any[]): { t: string };
export function resolveSSRNode(node: any): string;
export function ssrClassList(value: { [k: string]: boolean }): string;
export function ssrStyle(value: { [k: string]: string }): string;
export function ssrSpread(accessor: any): () => string;
export function ssrBoolean(key: string, value: boolean): string;
export function escape(html: string): string;
export function getHydrationKey(): string;
export function effect<T>(fn: (prev?: T) => T, init?: T): void;
export function memo<T>(fn: () => T, equal: boolean): () => T;
export function createComponent<T>(Comp: (props: T) => JSX.Element, props: T): JSX.Element;
export function mergeProps(...sources: unknown[]): unknown;
export function getOwner(): unknown;
