export const config: { [k: string]: any };
export function root<T>(fn: (dispose: () => void) => T): T;
export function effect<T>(fn: (prev?: T) => T, init?: T): any;
export function memo<T>(fn: () => T, equal: boolean): () => T;
export function currentContext(): any;
export function createComponent(Comp: (props: any) => any, props: any, dynamicKeys?: string[]): any;
export function getHydrationKey(): string;
export function setHydrateContext(context?: any): void;
export function nextHydrateContext(): any;