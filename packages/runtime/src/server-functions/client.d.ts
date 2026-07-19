import { JSONCodecOptions } from "../serializer.js";

export {
  FUNCTION_HEADER,
  INSTANCE_HEADER,
  SINGLE_FLIGHT_HEADER,
  decodeResponse,
  subscribeFlightData
} from "./shared.js";
export type { FlightDataConsumer, FlightDataContext, SingleFlightPayload } from "./shared.js";

/** Options for `configureServerFunctionsClient`. */
export interface ServerFunctionsClientConfig {
  /**
   * Endpoint the server's HTTP handler is mounted on. Must match the
   * server configuration — SSR'd reference `url`s (e.g. form actions) and
   * client fetches both derive from it. Prefix it when the app serves from
   * a base path (e.g. `` `${BASE_URL}_server` ``).
   * @default "/_server"
   */
  endpoint?: string;
  /**
   * Codec options (extra plugins etc.) for encoding arguments and decoding
   * results — must match the server's. Stored in the shared layer, so
   * `decodeResponse` sees them too.
   */
  codec?: JSONCodecOptions;
}

/**
 * Configures the client transport. Call once, before any server function is
 * invoked — typically in the client entry, next to `hydrate()`. Only needed
 * when deviating from the defaults (custom endpoint or codec plugins).
 */
export function configureServerFunctionsClient(config?: ServerFunctionsClientConfig): void;

/**
 * What a server function import is at runtime on the client: an async
 * callable that fetches the server, plus escape hatches for forms and
 * custom requests.
 */
export interface ServerFunctionCallable {
  (...args: any[]): Promise<any>;
  /** URL invoking this function directly over HTTP (e.g. form `action`s). */
  url: string;
  /**
   * Variant issuing GET requests with the arguments encoded in the query
   * string — cacheable by HTTP infrastructure.
   */
  GET: ServerFunctionCallable;
  /** Variant applying a custom RequestInit to every call (headers etc.). */
  withOptions(options: RequestInit): ServerFunctionCallable;
}

/**
 * Compiler ABI — emitted by compiled `"use server"` client output where a
 * server function was referenced; produces the fetch-backed callable for
 * the function's build-stable id. Not meant for hand-written code.
 * @internal
 */
export function createServerReference(id: string): ServerFunctionCallable;

/**
 * Compiler ABI — only ever referenced by server-mode compiler output;
 * throws so a misconfigured build (server transform feeding a client
 * bundle) fails loudly instead of with a missing-export error. Not meant
 * for hand-written code.
 * @internal
 */
export function registerServerReference(): never;
