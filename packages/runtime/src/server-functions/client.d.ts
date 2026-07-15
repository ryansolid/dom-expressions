import { JSONCodecOptions } from "../serializer.js";

export { FUNCTION_HEADER, INSTANCE_HEADER, decodeResponse } from "./shared.js";

export interface ServerFunctionsClientConfig {
  /**
   * Endpoint the server handler is mounted on.
   * @default "/_server"
   */
  endpoint?: string;
  /** Codec options — must match the server's (stored in the shared layer). */
  codec?: JSONCodecOptions;
}

/** Configures the transport. Call before any server function is invoked. */
export function configureServerFunctionsClient(config?: ServerFunctionsClientConfig): void;

export interface ServerFunctionCallable {
  (...args: any[]): Promise<any>;
  /** URL invoking this function directly (e.g. form actions). */
  url: string;
  /** Variant encoding arguments in the query string. */
  GET: ServerFunctionCallable;
  /** Variant with a custom RequestInit. */
  withOptions(options: RequestInit): ServerFunctionCallable;
}

/**
 * Produces the client-side callable for a server function id. Compiled
 * client output calls this where a server function was referenced.
 */
export function cloneServerReference(id: string): ServerFunctionCallable;

/**
 * Only ever referenced by server-mode compiler output; throws so a
 * misconfigured build fails loudly.
 */
export function createServerReference(): never;
