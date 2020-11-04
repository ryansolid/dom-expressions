// forward declarations
declare namespace NodeJS {
  interface ReadableStream {}
}

export function renderToString<T>(fn: () => T): string;
export function renderToNodeStream<T>(fn: () => T): NodeJS.ReadableStream;
export function ssr(template: string[] | string, ...nodes: any[]): { t: string };
export function resolveSSRNode(node: any): string;
export function ssrClassList(value: { [k: string]: boolean }): string;
export function ssrStyle(value: { [k: string]: string }): string;
export function ssrSpread(accessor: any): () => string;
export function escape(html: string): string;
export function generateHydrationScript(options?: { eventNames?: string[], streaming?: boolean, resolved?: boolean }): string;
