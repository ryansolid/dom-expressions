import { JSONCodecOptions } from "../serializer.js";
import { ServerFunction, ServerFunctionMetadata } from "./shared.js";

export {
  FUNCTION_HEADER,
  INSTANCE_HEADER,
  SINGLE_FLIGHT_HEADER,
  decodeResponse,
  getServerFunctionMetadata,
  isServerFunction,
  subscribeFlightData,
  withMeta
} from "./shared.js";
export type {
  FlightDataConsumer,
  FlightDataContext,
  ServerFunction,
  ServerFunctionMetadata,
  SingleFlightPayload
} from "./shared.js";

/** The context `prepareRequest` receives alongside the outgoing RequestInit. */
export interface PrepareRequestContext {
  /** The build-stable id of the function being called. */
  id: string;
  /**
   * The reference's declaration metadata (e.g. `method: "GET"` for
   * `GET(fn)` references). Plain references carry an empty object.
   */
  meta: ServerFunctionMetadata | undefined;
}

/**
 * Client-side session-dynamic transport hook: runs before every
 * server-function fetch. Return (or mutate and return) the RequestInit the
 * transport will use — the hook sees the final init, transport headers
 * included. The motivating case is dynamic credentials that rotate during
 * a session and apply uniformly to every call (OAuth bearer tokens); it is
 * the client-side symmetric of the server handler hooks. Single hook, not
 * a chain — compose by wrapping functions in userland.
 */
export type PrepareRequestHook = (
  init: RequestInit,
  context: PrepareRequestContext
) => RequestInit | Promise<RequestInit>;

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
  /**
   * Runs before every server-function fetch. Return (or mutate and return)
   * the RequestInit the transport will use; `context.meta` is the
   * reference's declaration metadata (e.g. method). For session-dynamic
   * cross-cutting concerns — bearer tokens, tracing headers:
   *
   * ```ts
   * configureServerFunctionsClient({
   *   prepareRequest(init) {
   *     return {
   *       ...init,
   *       headers: { ...init.headers, Authorization: `Bearer ${session.token()}` }
   *     };
   *   }
   * });
   * ```
   */
  prepareRequest?: PrepareRequestHook;
}

/**
 * Configures the client transport. Call once, before any server function is
 * invoked — typically in the client entry, next to `hydrate()`. Only needed
 * when deviating from the defaults (custom endpoint, codec plugins, or a
 * `prepareRequest` hook).
 */
export function configureServerFunctionsClient(config?: ServerFunctionsClientConfig): void;

/**
 * Declares a server function callable over HTTP GET: calls to the returned
 * reference go out as GET requests with the arguments codec-encoded in the
 * query string — cacheable by HTTP infrastructure. Cache headers flow
 * through the handler's header forwarding
 * (`respond(data, { headers: { "cache-control": "max-age=60" } })`).
 *
 * The declaration rides the metadata channel
 * (`getServerFunctionMetadata(fn)?.method === "GET"`) for routers and
 * integrations to detect, and the server honors it: GET-declared functions
 * accept GET requests in addition to the default POST transport (declaring
 * GET grants, it does not revoke); functions that never declared GET answer
 * GET requests with 405. Server-side the wrapper is identity-flavored — SSR
 * calls stay in-process.
 *
 * Wrap the reference at its declaration; the compiler round-trips the call
 * in both builds:
 *
 * ```ts
 * export const getUser = GET(async (id: string) => {
 *   "use server";
 *   return db.users.find(id);
 * });
 * ```
 */
export function GET<A extends readonly any[], R>(
  fn: (...args: A) => R
): ServerFunction<A, Awaited<R>>;

/**
 * Compiler ABI — emitted by compiled `"use server"` client output where a
 * server function was referenced; produces the fetch-backed callable for
 * the function's build-stable id. Development builds pass the function's
 * source name as the trailing argument (dev-only metadata seeded on the
 * metadata channel; never emitted in production). Not meant for
 * hand-written code.
 * @internal
 */
export function createServerReference(id: string, name?: string): ServerFunction;

/**
 * Compiler ABI — only ever referenced by server-mode compiler output;
 * throws so a misconfigured build (server transform feeding a client
 * bundle) fails loudly instead of with a missing-export error. Not meant
 * for hand-written code.
 * @internal
 */
export function registerServerReference(): never;
